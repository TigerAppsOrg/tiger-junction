import { describe, test, expect, afterAll, beforeAll } from "bun:test";
import type { FastifyInstance } from "fastify";
import type { AddressInfo } from "node:net";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { getApp, closeApp } from "./setup";

process.env.MCP_ACCESS_TOKEN = "test-mcp-token";

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

interface InjectResponse {
  statusCode: number;
  headers: Record<string, unknown>;
  body: string;
}

function parseSSEMessages(body: string): JsonRpcMessage[] {
  return body
    .split("\n")
    .filter((l: string) => l.startsWith("data: "))
    .map((l: string) => JSON.parse(l.slice(6)));
}

// Responses from the stateless handler may be SSE-formatted or plain JSON
// depending on negotiation; handle both.
function parseMessages(res: InjectResponse): JsonRpcMessage[] {
  const contentType = String(res.headers["content-type"] ?? "");
  if (contentType.includes("text/event-stream")) {
    return parseSSEMessages(res.body);
  }
  const parsed = JSON.parse(res.body);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function parseJsonRpcError(body: string): JsonRpcErrorPayload {
  return JSON.parse(body) as JsonRpcErrorPayload;
}

// Stateless serving: every POST is independent — no session header required,
// no prior initialize required.
async function postRpc(
  app: FastifyInstance,
  baseUrl: string,
  payload: Record<string, unknown>,
  extraHeaders: Record<string, string> = {}
): Promise<InjectResponse> {
  const res = await app.inject({
    method: "POST",
    url: baseUrl,
    headers: { ...MCP_HEADERS, ...extraHeaders },
    payload,
  });
  return res;
}

const INITIALIZE_PAYLOAD = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "test-client", version: "1.0.0" },
  },
};

describe("POST /mcp (legacy 2025-era, stateless)", () => {
  test("returns 401 without auth", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      payload: INITIALIZE_PAYLOAD,
    });

    expect(res.statusCode).toBe(401);
    const error = parseJsonRpcError(res.body);
    expect(error.error.code).toBe(-32001);
  });

  test("returns 401 with wrong bearer token", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: { ...MCP_HEADERS, authorization: "Bearer wrong-token" },
      payload: INITIALIZE_PAYLOAD,
    });

    expect(res.statusCode).toBe(401);
    const error = parseJsonRpcError(res.body);
    expect(error.error.code).toBe(-32001);
  });

  test("responds to initialize request", async () => {
    const app = await getApp();
    const res = await postRpc(app, "/mcp", INITIALIZE_PAYLOAD);

    expect(res.statusCode).toBe(200);

    const messages = parseMessages(res);
    const initResponse = messages.find((m) => m.id === 1);
    expect(initResponse).toBeDefined();
    expect(initResponse!.jsonrpc).toBe("2.0");
    const serverInfo = (initResponse!.result as Record<string, unknown>).serverInfo as Record<
      string,
      unknown
    >;
    expect(serverInfo.name).toBe("junction-engine");
  });

  test("lists tools via bare tools/list without prior initialize", async () => {
    const app = await getApp();
    const res = await postRpc(app, "/mcp", {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
    });

    expect(res.statusCode).toBe(200);
    const messages = parseMessages(res);
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

  test("calls list_departments tool without a session", async () => {
    const app = await getApp();
    const res = await postRpc(app, "/mcp", {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "list_departments", arguments: {} },
    });

    expect(res.statusCode).toBe(200);
    const messages = parseMessages(res);
    const callResponse = messages.find((m) => m.id === 3);
    expect(callResponse).toBeDefined();
    expect(callResponse!.result).toBeDefined();
    const content = (callResponse!.result as Record<string, unknown>).content as {
      type: string;
      text: string;
    }[];
    expect(content).toBeDefined();
    expect(content[0].type).toBe("text");

    const data = JSON.parse(content[0].text);
    expect(data.departments).toBeDefined();
    expect(Array.isArray(data.departments)).toBe(true);
  });

  test("returns deterministic tool error for malformed courseId", async () => {
    const app = await getApp();
    const res = await postRpc(app, "/mcp", {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "get_course_details",
        arguments: { courseId: "bad-id" },
      },
    });

    expect(res.statusCode).toBe(200);
    const messages = parseMessages(res);
    const callResponse = messages.find((m) => m.id === 4);
    expect(callResponse).toBeDefined();
    // Comes back as a tool result (isError), not a JSON-RPC error.
    expect(callResponse!.error).toBeUndefined();
    expect(callResponse!.result).toBeDefined();
    const result = callResponse!.result as Record<string, unknown>;
    expect(result.isError).toBe(true);
    const content = result.content as { type: string; text: string }[];
    const payload = JSON.parse(content[0].text);
    expect(payload.error).toContain("Invalid courseId");
  });

  test("returns deterministic tool error for malformed listingId", async () => {
    const app = await getApp();
    const res = await postRpc(app, "/mcp", {
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: {
        name: "get_course_evaluations",
        arguments: { listingId: "abc" },
      },
    });

    expect(res.statusCode).toBe(200);
    const messages = parseMessages(res);
    const callResponse = messages.find((m) => m.id === 5);
    expect(callResponse).toBeDefined();
    expect(callResponse!.result).toBeDefined();
    const content = (callResponse!.result as Record<string, unknown>).content as {
      type: string;
      text: string;
    }[];
    const payload = JSON.parse(content[0].text);
    expect(payload.error).toContain("Invalid listingId");
  });

  test("blocks schedule tools without mapped identity context", async () => {
    const app = await getApp();
    const res = await postRpc(app, "/mcp", {
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: { name: "get_user_schedules", arguments: { userId: 1 } },
    });

    expect(res.statusCode).toBe(200);
    const messages = parseMessages(res);
    const callResponse = messages.find((m) => m.id === 6);
    expect(callResponse).toBeDefined();
    expect(callResponse!.result).toBeDefined();
    const content = (callResponse!.result as Record<string, unknown>).content as {
      type: string;
      text: string;
    }[];
    expect(content[0].text).toContain("Missing authenticated user context");
  });

  test("propagates per-request identity headers into the auth context", async () => {
    const app = await getApp();
    // With an identity header the failure changes from "missing context" to
    // "no identity mapping" — proving the header reaches the per-request
    // server factory rather than being silently dropped.
    const res = await postRpc(
      app,
      "/mcp",
      {
        jsonrpc: "2.0",
        id: 8,
        method: "tools/call",
        params: { name: "get_user_schedules", arguments: { userId: 1 } },
      },
      { "x-external-user-id": "test-unmapped-external-user" }
    );

    expect(res.statusCode).toBe(200);
    const messages = parseMessages(res);
    const callResponse = messages.find((m) => m.id === 8);
    expect(callResponse).toBeDefined();
    const content = (callResponse!.result as Record<string, unknown>).content as {
      type: string;
      text: string;
    }[];
    expect(content[0].text).toContain(
      "No identity mapping found for external user 'test-unmapped-external-user'"
    );
    expect(content[0].text).not.toContain("Missing authenticated user context");
  });
});

describe("GET /mcp", () => {
  test("returns 401 without auth", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "GET",
      url: "/mcp",
      headers: { accept: "application/json, text/event-stream" },
    });
    expect(res.statusCode).toBe(401);
  });

  test("returns 405 with valid auth (no legacy session streams)", async () => {
    const app = await getApp();
    const res = await app.inject({ method: "GET", url: "/mcp", headers: MCP_HEADERS });
    expect(res.statusCode).toBe(405);
  });
});

describe("DELETE /mcp", () => {
  test("returns 401 without auth", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "DELETE",
      url: "/mcp",
      headers: { accept: "application/json, text/event-stream" },
    });
    expect(res.statusCode).toBe(401);
  });

  test("returns 405 with valid auth (no legacy session teardown)", async () => {
    const app = await getApp();
    const res = await app.inject({ method: "DELETE", url: "/mcp", headers: MCP_HEADERS });
    expect(res.statusCode).toBe(405);
  });
});

describe("POST /princetoncourses/mcp", () => {
  test("lists only PrincetonCourses scoped tools", async () => {
    const app = await getApp();
    const res = await postRpc(app, "/princetoncourses/mcp", {
      jsonrpc: "2.0",
      id: 7,
      method: "tools/list",
    });

    expect(res.statusCode).toBe(200);
    const messages = parseMessages(res);
    const toolListResponse = messages.find((m) => m.id === 7);
    expect(toolListResponse).toBeDefined();
    const tools = (toolListResponse!.result as Record<string, unknown>).tools as { name: string }[];
    const toolNames = tools.map((t) => t.name);

    expect(toolNames).toContain("search_courses");
    expect(toolNames).toContain("get_course_details");
    expect(toolNames).toContain("get_course_evaluations");
    expect(toolNames).toContain("search_instructors");

    expect(toolNames).not.toContain("get_user_schedules");
    expect(toolNames).not.toContain("get_schedule_details");
    expect(toolNames).not.toContain("find_courses_that_fit");
  });
});

describe("modern 2026-07-28 client (integration)", () => {
  let app: FastifyInstance;
  let mcpUrl: URL;

  beforeAll(async () => {
    app = await getApp();
    await app.listen({ port: 0, host: "127.0.0.1" });
    const address = app.server.address() as AddressInfo;
    mcpUrl = new URL(`http://127.0.0.1:${address.port}/mcp`);
  });

  async function connectClient(): Promise<Client> {
    const transport = new StreamableHTTPClientTransport(mcpUrl, {
      requestInit: {
        headers: {
          authorization: "Bearer test-mcp-token",
          "x-user-netid": "testnetid",
        },
      },
    });
    const client = new Client(
      { name: "test-modern-client", version: "1.0.0" },
      { versionNegotiation: { mode: "auto" } }
    );
    await client.connect(transport);
    // Auto negotiation may silently fall back to the legacy initialize
    // handshake; assert the server/discover probe actually landed on the
    // modern era so a broken 2026-07-28 path cannot hide behind the fallback.
    expect(client.getProtocolEra()).toBe("modern");
    return client;
  }

  test("connects and lists tools", async () => {
    const client = await connectClient();
    try {
      const result = await client.listTools();
      const toolNames = result.tools.map((t) => t.name);
      expect(toolNames).toContain("search_courses");
      expect(toolNames).toContain("get_course_details");
      expect(toolNames).toContain("get_course_evaluations");
      expect(toolNames).toContain("get_instructor");
      expect(toolNames).toContain("get_user_schedules");
      expect(toolNames).toContain("list_departments");
    } finally {
      await client.close();
    }
  });

  test("calls list_departments and gets parseable JSON text content", async () => {
    const client = await connectClient();
    try {
      const result = await client.callTool({ name: "list_departments", arguments: {} });
      const content = result.content as { type: string; text: string }[];
      expect(Array.isArray(content)).toBe(true);
      expect(content[0].type).toBe("text");
      const data = JSON.parse(content[0].text);
      expect(data.departments).toBeDefined();
      expect(Array.isArray(data.departments)).toBe(true);
    } finally {
      await client.close();
    }
  });

  test("surfaces tool errors as tool results, not protocol errors", async () => {
    const client = await connectClient();
    try {
      const result = await client.callTool({
        name: "get_course_details",
        arguments: { courseId: "bad-id" },
      });
      expect(result.isError).toBe(true);
      const content = result.content as { type: string; text: string }[];
      const payload = JSON.parse(content[0].text);
      expect(payload.error).toContain("Invalid courseId");
    } finally {
      await client.close();
    }
  });
});
