import { randomUUID } from "node:crypto";
import { type FastifyPluginAsync } from "fastify";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpServer } from "../mcp/index.js";

interface McpSession {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
}

const mcpRoutes: FastifyPluginAsync = async (app) => {
  const sessions = new Map<string, McpSession>();

  app.post("/", {
    config: { rawBody: true },
    schema: { hide: true },
  }, async (request, reply) => {
    const sessionId = request.headers["mcp-session-id"] as string | undefined;

    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      reply.hijack();
      await session.transport.handleRequest(request.raw, reply.raw, request.body);
      return;
    }

    try {
      const mcpServer = createMcpServer(app.db.db);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid) sessions.delete(sid);
      };

      await mcpServer.connect(transport);
      reply.hijack();
      await transport.handleRequest(request.raw, reply.raw, request.body);

      if (transport.sessionId) {
        sessions.set(transport.sessionId, { server: mcpServer, transport });
      }
    } catch (err) {
      if (!reply.sent) {
        app.log.error(err, "MCP request failed");
        return reply.code(500).send({ error: "Internal MCP error" });
      }
    }
  });

  app.get("/", { schema: { hide: true } }, async (request, reply) => {
    const sessionId = request.headers["mcp-session-id"] as string | undefined;
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      reply.hijack();
      await session.transport.handleRequest(request.raw, reply.raw);
      return;
    }

    reply.hijack();
    const res = reply.raw;
    res.writeHead(400);
    res.end(JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Bad Request: No valid session. Initialize first via POST." },
      id: null,
    }));
  });

  app.delete("/", { schema: { hide: true } }, async (request, reply) => {
    const sessionId = request.headers["mcp-session-id"] as string | undefined;
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      await session.transport.close();
      sessions.delete(sessionId);
      return reply.code(200).send();
    }

    return reply.code(400).send({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Bad Request: No valid session." },
      id: null,
    });
  });

  app.addHook("onClose", async () => {
    for (const [, session] of sessions) {
      await session.transport.close();
    }
    sessions.clear();
  });
};

export default mcpRoutes;
