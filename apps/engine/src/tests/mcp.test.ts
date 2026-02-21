import { describe, test, expect, afterAll } from "bun:test";
import type { FastifyInstance } from "fastify";
import { getApp, closeApp } from "./setup";

const MCP_HEADERS = {
  "content-type": "application/json",
  accept: "application/json, text/event-stream",
};

afterAll(async () => {
  await closeApp();
});

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

async function initializeSession(app: FastifyInstance): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/mcp",
    headers: MCP_HEADERS,
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
    url: "/mcp",
    headers: { ...MCP_HEADERS, "mcp-session-id": sessionId },
    payload: {
      jsonrpc: "2.0",
      method: "notifications/initialized",
    },
  });

  return sessionId;
}

describe("POST /mcp", () => {
  test("responds to initialize request", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: MCP_HEADERS,
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

    expect(res.statusCode).toBe(200);
    expect(res.headers["mcp-session-id"]).toBeDefined();

    const messages = parseSSEMessages(res.body);
    const initResponse = messages.find((m) => m.id === 1);
    expect(initResponse).toBeDefined();
    expect(initResponse!.jsonrpc).toBe("2.0");
    const serverInfo = (initResponse!.result as Record<string, unknown>).serverInfo as Record<string, unknown>;
    expect(serverInfo.name).toBe("junction-engine");
  });

  test("lists tools via tools/list", async () => {
    const app = await getApp();
    const sessionId = await initializeSession(app);

    const res = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: {
        ...MCP_HEADERS,
        "mcp-session-id": sessionId,
        "mcp-protocol-version": "2025-03-26",
      },
      payload: {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
      },
    });

    expect(res.statusCode).toBe(200);
    const messages = parseSSEMessages(res.body);
    const toolListResponse = messages.find((m) => m.id === 2);
    expect(toolListResponse).toBeDefined();
    const tools = (toolListResponse!.result as Record<string, unknown>).tools as { name: string }[];
    expect(tools).toBeDefined();
    expect(Array.isArray(tools)).toBe(true);

    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain("search_courses");
    expect(toolNames).toContain("get_course_details");
    expect(toolNames).toContain("get_course_sections");
    expect(toolNames).toContain("list_departments");
    expect(toolNames).toContain("discover_courses");
    expect(toolNames).toContain("get_course_evaluations");
    expect(toolNames).toContain("find_top_rated_courses");
    expect(toolNames).toContain("summarize_course_reviews");
    expect(toolNames).toContain("get_instructor");
    expect(toolNames).toContain("search_instructors");
    expect(toolNames).toContain("get_instructor_courses");
    expect(toolNames).toContain("get_user_schedules");
    expect(toolNames).toContain("get_schedule_details");
    expect(toolNames).toContain("find_courses_that_fit");
  });

  test("calls list_departments tool", async () => {
    const app = await getApp();
    const sessionId = await initializeSession(app);

    const res = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: {
        ...MCP_HEADERS,
        "mcp-session-id": sessionId,
        "mcp-protocol-version": "2025-03-26",
      },
      payload: {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "list_departments",
          arguments: {},
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const messages = parseSSEMessages(res.body);
    const callResponse = messages.find((m) => m.id === 3);
    expect(callResponse).toBeDefined();
    expect(callResponse!.result).toBeDefined();
    const content = (callResponse!.result as Record<string, unknown>).content as { type: string; text: string }[];
    expect(content).toBeDefined();
    expect(content[0].type).toBe("text");

    const data = JSON.parse(content[0].text);
    expect(data.departments).toBeDefined();
    expect(Array.isArray(data.departments)).toBe(true);
  });
});

describe("GET /mcp", () => {
  test("returns 400 without session", async () => {
    const app = await getApp();
    const res = await app.inject({ method: "GET", url: "/mcp" });
    expect(res.statusCode).toBe(400);
  });
});

describe("DELETE /mcp", () => {
  test("returns 400 without valid session", async () => {
    const app = await getApp();
    const res = await app.inject({ method: "DELETE", url: "/mcp" });
    expect(res.statusCode).toBe(400);
  });

  test("closes session with valid session ID", async () => {
    const app = await getApp();
    const sessionId = await initializeSession(app);

    const res = await app.inject({
      method: "DELETE",
      url: "/mcp",
      headers: { "mcp-session-id": sessionId },
    });
    expect(res.statusCode).toBe(200);
  });
});
