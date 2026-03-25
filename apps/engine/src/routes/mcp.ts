import { randomUUID } from "node:crypto";
import { type FastifyPluginAsync } from "fastify";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpServer } from "../mcp/index.js";

interface AuthContext {
  externalUserId?: string;
  netid?: string;
}

interface McpSession {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
  authContext: AuthContext;
  clientKey: string;
  createdAt: number;
  lastSeenAt: number;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getSessionTtlMs(): number {
  return parsePositiveInt(process.env.MCP_SESSION_TTL_MS, 30 * 60 * 1000);
}

function getMaxSessionsPerClient(): number {
  return parsePositiveInt(process.env.MCP_MAX_SESSIONS_PER_CLIENT, 20);
}

function extractBearerToken(headerValue: string | undefined): string | null {
  if (!headerValue) return null;
  const [scheme, token] = headerValue.trim().split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") return null;
  return token;
}

function rpcError(code: number, message: string) {
  return {
    jsonrpc: "2.0",
    error: { code, message },
    id: null,
  };
}

const mcpRoutes: FastifyPluginAsync = async (app) => {
  const sessions = new Map<string, McpSession>();
  const cleanupExpiredSessions = async (): Promise<void> => {
    const now = Date.now();
    const ttl = getSessionTtlMs();
    for (const [sessionId, session] of sessions) {
      if (now - session.lastSeenAt > ttl) {
        await session.transport.close();
        sessions.delete(sessionId);
      }
    }
  };

  const touchSession = (session: McpSession) => {
    session.lastSeenAt = Date.now();
  };

  const authenticateRequest = (request: { headers: Record<string, unknown> }) => {
    const requiredToken = process.env.MCP_ACCESS_TOKEN?.trim();
    const authHeader = request.headers.authorization;
    const bearerToken = typeof authHeader === "string" ? extractBearerToken(authHeader) : null;

    if (requiredToken && bearerToken !== requiredToken) {
      return null;
    }

    const externalUserIdHeader = request.headers["x-external-user-id"];
    const netidHeader = request.headers["x-user-netid"];
    const externalUserId =
      typeof externalUserIdHeader === "string" && externalUserIdHeader.trim().length > 0
        ? externalUserIdHeader.trim()
        : undefined;
    const netid = typeof netidHeader === "string" && netidHeader.trim().length > 0 ? netidHeader.trim() : undefined;

    const clientKey = externalUserId ?? netid ?? (bearerToken ? `token:${bearerToken.slice(0, 8)}` : "anonymous");
    return {
      clientKey,
      authContext: {
        externalUserId,
        netid,
      } satisfies AuthContext,
    };
  };

  const enforceSessionClientBinding = (session: McpSession, clientKey: string) => session.clientKey === clientKey;

  const cleanupInterval = setInterval(() => {
    void cleanupExpiredSessions();
  }, 60_000);

  app.post("/", {
    config: { rawBody: true },
    schema: { hide: true },
  }, async (request, reply) => {
    const auth = authenticateRequest(request);
    if (!auth) {
      return reply.code(401).send(rpcError(-32001, "Unauthorized: missing or invalid bearer token."));
    }

    await cleanupExpiredSessions();
    const sessionId = request.headers["mcp-session-id"] as string | undefined;

    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      if (!enforceSessionClientBinding(session, auth.clientKey)) {
        return reply.code(403).send(rpcError(-32003, "Forbidden: session does not belong to this caller."));
      }
      touchSession(session);
      reply.hijack();
      await session.transport.handleRequest(request.raw, reply.raw, request.body);
      return;
    }

    try {
      const activeSessionsForClient = [...sessions.values()].filter((s) => s.clientKey === auth.clientKey).length;
      if (activeSessionsForClient >= getMaxSessionsPerClient()) {
        return reply
          .code(429)
          .send(rpcError(-32009, "Too many active MCP sessions for this client. Close a session and retry."));
      }

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
        const now = Date.now();
        sessions.set(transport.sessionId, {
          server: mcpServer,
          transport,
          authContext: auth.authContext,
          clientKey: auth.clientKey,
          createdAt: now,
          lastSeenAt: now,
        });
      }
    } catch (err) {
      if (!reply.sent) {
        app.log.error(err, "MCP request failed");
        return reply.code(500).send({ error: "Internal MCP error" });
      }
    }
  });

  app.get("/", { schema: { hide: true } }, async (request, reply) => {
    const auth = authenticateRequest(request);
    if (!auth) {
      return reply.code(401).send(rpcError(-32001, "Unauthorized: missing or invalid bearer token."));
    }

    await cleanupExpiredSessions();
    const sessionId = request.headers["mcp-session-id"] as string | undefined;
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      if (!enforceSessionClientBinding(session, auth.clientKey)) {
        return reply.code(403).send(rpcError(-32003, "Forbidden: session does not belong to this caller."));
      }
      touchSession(session);
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
    const auth = authenticateRequest(request);
    if (!auth) {
      return reply.code(401).send(rpcError(-32001, "Unauthorized: missing or invalid bearer token."));
    }

    await cleanupExpiredSessions();
    const sessionId = request.headers["mcp-session-id"] as string | undefined;
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      if (!enforceSessionClientBinding(session, auth.clientKey)) {
        return reply.code(403).send(rpcError(-32003, "Forbidden: session does not belong to this caller."));
      }
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
    clearInterval(cleanupInterval);
    for (const [, session] of sessions) {
      await session.transport.close();
    }
    sessions.clear();
  });
};

export default mcpRoutes;
