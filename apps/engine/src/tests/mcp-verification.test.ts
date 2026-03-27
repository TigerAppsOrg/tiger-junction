import { describe, test, expect, afterAll, beforeAll } from "bun:test";
import type { FastifyInstance } from "fastify";
import { getApp, closeApp } from "./setup";
import { Client } from "pg";
import "dotenv/config";

process.env.MCP_ACCESS_TOKEN = "test-mcp-token";
process.env.MCP_MAX_SESSIONS_PER_CLIENT = "20";
process.env.MCP_SESSION_TTL_MS = "1800000";

const MCP_HEADERS = {
  "content-type": "application/json",
  accept: "application/json, text/event-stream",
  authorization: "Bearer test-mcp-token",
};

interface JsonRpcMessage {
  jsonrpc: string;
  id?: number;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

function parseSSEMessages(body: string): JsonRpcMessage[] {
  return body
    .split("\n")
    .filter((l: string) => l.startsWith("data: "))
    .map((l: string) => JSON.parse(l.slice(6)));
}

async function initializeSessionAt(
  app: FastifyInstance,
  baseUrl: string,
  extraHeaders: Record<string, string> = {}
): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: baseUrl,
    headers: { ...MCP_HEADERS, ...extraHeaders },
    payload: {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "test-client", version: "1.0.0" },
      },
    },
  });

  const sessionId = res.headers["mcp-session-id"] as string;
  await app.inject({
    method: "POST",
    url: baseUrl,
    headers: { ...MCP_HEADERS, ...extraHeaders, "mcp-session-id": sessionId },
    payload: { jsonrpc: "2.0", method: "notifications/initialized" },
  });
  return sessionId;
}

async function callTool(
  app: FastifyInstance,
  baseUrl: string,
  sessionId: string,
  toolName: string,
  args: Record<string, unknown>,
  extraHeaders: Record<string, string> = {},
  rpcId = 10
) {
  const res = await app.inject({
    method: "POST",
    url: baseUrl,
    headers: {
      ...MCP_HEADERS,
      ...extraHeaders,
      "mcp-session-id": sessionId,
      "mcp-protocol-version": "2025-03-26",
    },
    payload: {
      jsonrpc: "2.0",
      id: rpcId,
      method: "tools/call",
      params: { name: toolName, arguments: args },
    },
  });
  const messages = parseSSEMessages(res.body);
  const callResponse = messages.find((m) => m.id === rpcId);
  return { res, callResponse };
}

function extractToolText(callResponse: JsonRpcMessage | undefined): string {
  const content = (callResponse?.result as Record<string, unknown>)?.content as
    | { type: string; text: string }[]
    | undefined;
  return content?.[0]?.text ?? "";
}

function extractToolIsError(callResponse: JsonRpcMessage | undefined): boolean {
  return (callResponse?.result as Record<string, unknown>)?.isError === true;
}

// Seed test data into the local engine DB
let pgClient: Client;
let testUserId: number;
let testUser2Id: number;
let testScheduleId: number;
let testSchedule2Id: number;
let testCourseId: string;

beforeAll(async () => {
  pgClient = new Client({ connectionString: process.env.POSTGRES_URL });
  await pgClient.connect();

  // Create two test users
  const u1 = await pgClient.query(
    "INSERT INTO users (email, netid, year) VALUES ('test1@princeton.edu', 'testuser1', 2026) RETURNING id"
  );
  testUserId = u1.rows[0].id;

  const u2 = await pgClient.query(
    "INSERT INTO users (email, netid, year) VALUES ('test2@princeton.edu', 'testuser2', 2026) RETURNING id"
  );
  testUser2Id = u2.rows[0].id;

  // Create external_user_identities mappings
  await pgClient.query(
    "INSERT INTO external_user_identities (provider, external_user_id, engine_user_id, netid) VALUES ('supabase', 'ext-user-1', $1, 'testuser1')",
    [testUserId]
  );
  await pgClient.query(
    "INSERT INTO external_user_identities (provider, external_user_id, engine_user_id, netid) VALUES ('supabase', 'ext-user-2', $1, 'testuser2')",
    [testUser2Id]
  );

  // Pick a real course from the DB to use in tests
  const courseRow = await pgClient.query(
    "SELECT id, term FROM courses LIMIT 1"
  );
  testCourseId = courseRow.rows[0].id;
  const testTerm = courseRow.rows[0].term;

  // Create schedules for user 1 and user 2
  const s1 = await pgClient.query(
    "INSERT INTO schedules (relative_id, user_id, title, term) VALUES (1, $1, 'Test Schedule', $2) RETURNING id",
    [testUserId, testTerm]
  );
  testScheduleId = s1.rows[0].id;

  const s2 = await pgClient.query(
    "INSERT INTO schedules (relative_id, user_id, title, term) VALUES (1, $1, 'Other User Schedule', $2) RETURNING id",
    [testUser2Id, testTerm]
  );
  testSchedule2Id = s2.rows[0].id;

  // Add a course to user 1's schedule
  await pgClient.query(
    "INSERT INTO schedule_course_map (schedule_id, course_id, color) VALUES ($1, $2, 0)",
    [testScheduleId, testCourseId]
  );
});

afterAll(async () => {
  // Clean up test data
  await pgClient.query("DELETE FROM schedule_course_map WHERE schedule_id = $1", [testScheduleId]);
  await pgClient.query("DELETE FROM schedules WHERE id IN ($1, $2)", [testScheduleId, testSchedule2Id]);
  await pgClient.query("DELETE FROM external_user_identities WHERE engine_user_id IN ($1, $2)", [testUserId, testUser2Id]);
  await pgClient.query("DELETE FROM users WHERE id IN ($1, $2)", [testUserId, testUser2Id]);
  await pgClient.end();
  await closeApp();
});

// ─── 1. get_user_schedules returns correct schedules for authenticated user ───
describe("Verification 1: get_user_schedules returns correct schedules", () => {
  test("returns schedules for the authenticated user", async () => {
    const app = await getApp();
    const sessionId = await initializeSessionAt(app, "/mcp", {
      "x-external-user-id": "ext-user-1",
    });

    const { callResponse } = await callTool(
      app, "/mcp", sessionId,
      "get_user_schedules",
      { userId: testUserId },
      { "x-external-user-id": "ext-user-1" }
    );

    expect(callResponse).toBeDefined();
    expect(extractToolIsError(callResponse)).toBe(false);

    const data = JSON.parse(extractToolText(callResponse));
    expect(data.count).toBeGreaterThanOrEqual(1);
    const titles = data.schedules.map((s: { title: string }) => s.title);
    expect(titles).toContain("Test Schedule");
  });

  test("does NOT return other users' schedules", async () => {
    const app = await getApp();
    const sessionId = await initializeSessionAt(app, "/mcp", {
      "x-external-user-id": "ext-user-1",
    });

    const { callResponse } = await callTool(
      app, "/mcp", sessionId,
      "get_user_schedules",
      { userId: testUserId },
      { "x-external-user-id": "ext-user-1" }
    );

    const data = JSON.parse(extractToolText(callResponse));
    const titles = data.schedules.map((s: { title: string }) => s.title);
    expect(titles).not.toContain("Other User Schedule");
  });
});

// ─── 2. Schedule-course association has proper metadata (engine variant) ───────
describe("Verification 2: get_schedule_details shows course association", () => {
  test("schedule details include linked course", async () => {
    const app = await getApp();
    const sessionId = await initializeSessionAt(app, "/mcp", {
      "x-external-user-id": "ext-user-1",
    });

    const { callResponse } = await callTool(
      app, "/mcp", sessionId,
      "get_schedule_details",
      { scheduleId: testScheduleId },
      { "x-external-user-id": "ext-user-1" }
    );

    expect(callResponse).toBeDefined();
    expect(extractToolIsError(callResponse)).toBe(false);

    const data = JSON.parse(extractToolText(callResponse));
    expect(data.schedule).toBeDefined();
    expect(data.schedule.title).toBe("Test Schedule");
    expect(data.courses.length).toBeGreaterThanOrEqual(1);
    expect(data.courses[0].courseId).toBe(testCourseId);
  });
});

// ─── 3. find_courses_that_fit excludes conflicting courses (engine variant) ───
describe("Verification 3: find_courses_that_fit excludes conflicting courses", () => {
  test("returns courses that don't conflict with existing schedule", async () => {
    const app = await getApp();
    const sessionId = await initializeSessionAt(app, "/mcp", {
      "x-external-user-id": "ext-user-1",
    });

    const { callResponse } = await callTool(
      app, "/mcp", sessionId,
      "find_courses_that_fit",
      { scheduleId: testScheduleId, limit: 10 },
      { "x-external-user-id": "ext-user-1" }
    );

    expect(callResponse).toBeDefined();
    expect(extractToolIsError(callResponse)).toBe(false);

    const data = JSON.parse(extractToolText(callResponse));
    expect(data.scheduleId).toBe(testScheduleId);
    expect(data.courses).toBeDefined();
    expect(Array.isArray(data.courses)).toBe(true);

    // The course already in the schedule should NOT appear in results
    const ids = data.courses.map((c: { id: string }) => c.id);
    expect(ids).not.toContain(testCourseId);
  });
});

// ─── 4. Write tools reject operations on schedules not owned by the user ──────
describe("Verification 4: ownership enforcement on schedule tools", () => {
  test("get_schedule_details rejects access to another user's schedule", async () => {
    const app = await getApp();
    const sessionId = await initializeSessionAt(app, "/mcp", {
      "x-external-user-id": "ext-user-1",
    });

    // User 1 tries to access User 2's schedule
    const { callResponse } = await callTool(
      app, "/mcp", sessionId,
      "get_schedule_details",
      { scheduleId: testSchedule2Id },
      { "x-external-user-id": "ext-user-1" }
    );

    expect(callResponse).toBeDefined();
    expect(extractToolIsError(callResponse)).toBe(true);
    expect(extractToolText(callResponse)).toContain("Forbidden");
  });

  test("get_user_schedules rejects request for another userId", async () => {
    const app = await getApp();
    const sessionId = await initializeSessionAt(app, "/mcp", {
      "x-external-user-id": "ext-user-1",
    });

    // User 1 tries to fetch User 2's schedules by passing user2's ID
    const { callResponse } = await callTool(
      app, "/mcp", sessionId,
      "get_user_schedules",
      { userId: testUser2Id },
      { "x-external-user-id": "ext-user-1" }
    );

    expect(callResponse).toBeDefined();
    expect(extractToolIsError(callResponse)).toBe(true);
    expect(extractToolText(callResponse)).toContain("Forbidden");
  });

  test("find_courses_that_fit rejects access to another user's schedule", async () => {
    const app = await getApp();
    const sessionId = await initializeSessionAt(app, "/mcp", {
      "x-external-user-id": "ext-user-1",
    });

    const { callResponse } = await callTool(
      app, "/mcp", sessionId,
      "find_courses_that_fit",
      { scheduleId: testSchedule2Id },
      { "x-external-user-id": "ext-user-1" }
    );

    expect(callResponse).toBeDefined();
    expect(extractToolIsError(callResponse)).toBe(true);
    expect(extractToolText(callResponse)).toContain("Forbidden");
  });

  test("schedule tools blocked entirely without identity header", async () => {
    const app = await getApp();
    const sessionId = await initializeSessionAt(app, "/mcp");

    const { callResponse } = await callTool(
      app, "/mcp", sessionId,
      "get_user_schedules",
      { userId: testUserId }
    );

    expect(callResponse).toBeDefined();
    expect(extractToolIsError(callResponse)).toBe(true);
    expect(extractToolText(callResponse)).toContain("Missing authenticated user context");
  });
});

// ─── 5. Non-schedule tools work without NetID ────────────────────────────────
describe("Verification 5: non-schedule tools work without NetID", () => {
  test("search_courses works without any identity headers", async () => {
    const app = await getApp();
    const sessionId = await initializeSessionAt(app, "/mcp");

    const { callResponse } = await callTool(
      app, "/mcp", sessionId,
      "search_courses",
      { limit: 5 }
    );

    expect(callResponse).toBeDefined();
    expect(extractToolIsError(callResponse)).toBeFalsy();

    const data = JSON.parse(extractToolText(callResponse));
    expect(data.courses).toBeDefined();
    expect(data.count).toBeGreaterThan(0);
  });

  test("list_departments works without any identity headers", async () => {
    const app = await getApp();
    const sessionId = await initializeSessionAt(app, "/mcp");

    const { callResponse } = await callTool(
      app, "/mcp", sessionId,
      "list_departments",
      {}
    );

    expect(callResponse).toBeDefined();
    expect(extractToolIsError(callResponse)).toBeFalsy();

    const data = JSON.parse(extractToolText(callResponse));
    expect(data.departments).toBeDefined();
    expect(data.count).toBeGreaterThan(0);
  });

  test("search_instructors works without any identity headers", async () => {
    const app = await getApp();
    const sessionId = await initializeSessionAt(app, "/mcp");

    const { callResponse } = await callTool(
      app, "/mcp", sessionId,
      "search_instructors",
      { name: "a" }
    );

    expect(callResponse).toBeDefined();
    expect(extractToolIsError(callResponse)).toBeFalsy();

    const data = JSON.parse(extractToolText(callResponse));
    expect(data.instructors).toBeDefined();
  });

  test("get_course_details works without any identity headers", async () => {
    const app = await getApp();
    const sessionId = await initializeSessionAt(app, "/mcp");

    const { callResponse } = await callTool(
      app, "/mcp", sessionId,
      "get_course_details",
      { courseId: testCourseId }
    );

    expect(callResponse).toBeDefined();
    expect(extractToolIsError(callResponse)).toBeFalsy();

    const data = JSON.parse(extractToolText(callResponse));
    expect(data.courseId).toBe(testCourseId);
    expect(data.title).toBeDefined();
  });

  test("list_terms works without any identity headers", async () => {
    const app = await getApp();
    const sessionId = await initializeSessionAt(app, "/mcp");

    const { callResponse } = await callTool(
      app, "/mcp", sessionId,
      "list_terms",
      {}
    );

    expect(callResponse).toBeDefined();
    expect(extractToolIsError(callResponse)).toBeFalsy();

    const data = JSON.parse(extractToolText(callResponse));
    expect(data.terms).toBeDefined();
    expect(data.count).toBeGreaterThan(0);
  });

  test("get_course_sections works without any identity headers", async () => {
    const app = await getApp();
    const sessionId = await initializeSessionAt(app, "/mcp");

    const { callResponse } = await callTool(
      app, "/mcp", sessionId,
      "get_course_sections",
      { courseId: testCourseId }
    );

    expect(callResponse).toBeDefined();
    expect(extractToolIsError(callResponse)).toBeFalsy();

    const data = JSON.parse(extractToolText(callResponse));
    expect(data.courseId).toBe(testCourseId);
    expect(data.sections).toBeDefined();
  });

  test("princetoncourses scope excludes schedule tools entirely", async () => {
    const app = await getApp();
    const sessionId = await initializeSessionAt(app, "/princetoncourses/mcp");

    const res = await app.inject({
      method: "POST",
      url: "/princetoncourses/mcp",
      headers: {
        ...MCP_HEADERS,
        "mcp-session-id": sessionId,
        "mcp-protocol-version": "2025-03-26",
      },
      payload: { jsonrpc: "2.0", id: 99, method: "tools/list" },
    });

    const messages = parseSSEMessages(res.body);
    const toolList = messages.find((m) => m.id === 99);
    const tools = (toolList?.result as Record<string, unknown>)?.tools as { name: string }[];
    const toolNames = tools.map((t) => t.name);

    expect(toolNames).toContain("search_courses");
    expect(toolNames).toContain("get_course_evaluations");
    expect(toolNames).toContain("search_instructors");
    expect(toolNames).not.toContain("get_user_schedules");
    expect(toolNames).not.toContain("get_schedule_details");
    expect(toolNames).not.toContain("find_courses_that_fit");
  });
});
