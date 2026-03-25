import { describe, test, expect, afterAll } from "bun:test";
import type { FastifyInstance } from "fastify";
import { getApp, closeApp } from "./setup";

process.env.MCP_ACCESS_TOKEN = "test-mcp-token";
process.env.MCP_MAX_SESSIONS_PER_CLIENT = "20";
process.env.MCP_SESSION_TTL_MS = "1800000";

const MCP_HEADERS = {
  "content-type": "application/json",
  accept: "application/json, text/event-stream",
  authorization: "Bearer test-mcp-token",
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

interface JsonRpcErrorPayload {
  jsonrpc: string;
  id: null;
  error: { code: number; message: string };
}

function parseSSEMessages(body: string): JsonRpcMessage[] {
  return body
    .split("\n")
    .filter((l: string) => l.startsWith("data: "))
    .map((l: string) => JSON.parse(l.slice(6)));
}

function parseJsonRpcError(body: string): JsonRpcErrorPayload {
  return JSON.parse(body) as JsonRpcErrorPayload;
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
  test("returns 401 without valid auth", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
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

    expect(res.statusCode).toBe(401);
    const error = parseJsonRpcError(res.body);
    expect(error.error.code).toBe(-32001);
  });

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

  test("returns deterministic error for malformed courseId", async () => {
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
        id: 4,
        method: "tools/call",
        params: {
          name: "get_course_details",
          arguments: {
            courseId: "bad-id",
          },
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const messages = parseSSEMessages(res.body);
    const callResponse = messages.find((m) => m.id === 4);
    expect(callResponse).toBeDefined();
    expect(callResponse!.result).toBeDefined();
    const content = (callResponse!.result as Record<string, unknown>).content as { type: string; text: string }[];
    const payload = JSON.parse(content[0].text);
    expect(payload.error).toContain("Invalid courseId");
  });

  test("returns deterministic error for malformed listingId", async () => {
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
        id: 5,
        method: "tools/call",
        params: {
          name: "get_course_evaluations",
          arguments: {
            listingId: "abc",
          },
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const messages = parseSSEMessages(res.body);
    const callResponse = messages.find((m) => m.id === 5);
    expect(callResponse).toBeDefined();
    expect(callResponse!.result).toBeDefined();
    const content = (callResponse!.result as Record<string, unknown>).content as { type: string; text: string }[];
    const payload = JSON.parse(content[0].text);
    expect(payload.error).toContain("Invalid listingId");
  });

  test("blocks schedule tools without mapped identity context", async () => {
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
        id: 6,
        method: "tools/call",
        params: {
          name: "get_user_schedules",
          arguments: { userId: 1 },
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const messages = parseSSEMessages(res.body);
    const callResponse = messages.find((m) => m.id === 6);
    expect(callResponse).toBeDefined();
    expect(callResponse!.result).toBeDefined();
    const content = (callResponse!.result as Record<string, unknown>).content as { type: string; text: string }[];
    expect(content[0].text).toContain("Missing authenticated user context");
  });

  test("expires session after ttl", async () => {
    const app = await getApp();
    process.env.MCP_SESSION_TTL_MS = "1";
    const sessionId = await initializeSession(app);
    await Bun.sleep(10);

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
        id: 99,
        method: "tools/list",
      },
    });

    expect(res.statusCode).toBe(200);
    const messages = parseSSEMessages(res.body);
    const response = messages.find((m) => m.id === 99);
    expect(response).toBeDefined();
    expect(response?.error).toBeDefined();
    process.env.MCP_SESSION_TTL_MS = "1800000";
  });
});

describe("GET /mcp", () => {
  test("returns 400 without session", async () => {
    const app = await getApp();
    const res = await app.inject({ method: "GET", url: "/mcp", headers: MCP_HEADERS });
    expect(res.statusCode).toBe(400);
  });
});

describe("DELETE /mcp", () => {
  test("returns 400 without valid session", async () => {
    const app = await getApp();
    const res = await app.inject({ method: "DELETE", url: "/mcp", headers: MCP_HEADERS });
    expect(res.statusCode).toBe(400);
  });

  test("closes session with valid session ID", async () => {
    const app = await getApp();
    const sessionId = await initializeSession(app);

    const res = await app.inject({
      method: "DELETE",
      url: "/mcp",
      headers: { ...MCP_HEADERS, "mcp-session-id": sessionId },
    });
    expect(res.statusCode).toBe(200);
  });
});
