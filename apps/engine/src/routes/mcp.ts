import { randomUUID } from "node:crypto";
import { type FastifyPluginAsync, type FastifyReply, type FastifyRequest } from "fastify";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { createMcpServer } from "../mcp/index.js";
import type { McpToolScope } from "../mcp/index.js";
import type { AuthContext } from "../mcp/context.js";

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

interface McpRouteOptions {
  scope?: McpToolScope;
}

const mcpRoutes: FastifyPluginAsync<McpRouteOptions> = async (app, opts) => {
  const scope = opts.scope ?? "full";

  // Accept empty JSON bodies on this plugin's routes. Without this, DELETE /
  // requests from clients that set `content-type: application/json` but send
  // no body (httpx does this on DELETE) are rejected with 400 by Fastify's
  // default parser before the MCP handler can answer them.
  app.removeContentTypeParser("application/json");
  app.addContentTypeParser("application/json", { parseAs: "string" }, (_req, body, done) => {
    const raw = typeof body === "string" ? body : (body?.toString?.("utf8") ?? "");
    if (raw.length === 0) return done(null, undefined);
    try {
      done(null, JSON.parse(raw));
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  const authContextFromHeaders = (headers: Headers | undefined): AuthContext => {
    const read = (name: string): string | undefined => {
      const value = headers?.get(name)?.trim();
      return value && value.length > 0 ? value : undefined;
    };
    return {
      externalUserId: read("x-external-user-id"),
      netid: read("x-user-netid"),
    };
  };

  // Serving is stateless and per-request: the factory builds a fresh McpServer
  // for every HTTP request, with the caller's identity read from that request's
  // headers. 2026-07-28 clients are served natively; 2025-era clients are served
  // through the SDK's stateless legacy fallback (no sessions — legacy GET/DELETE
  // session operations answer 405).
  const handler = createMcpHandler(
    ({ requestInfo }) => {
      const authContext = authContextFromHeaders(requestInfo?.headers);
      const supabase = scope === "junction" ? app.supabase : undefined;
      const snatchDb = scope === "junction" || scope === "snatch" ? app.snatchDb : undefined;
      const tigerpathPool = app.tigerpathPool ?? undefined;
      return createMcpServer(app.db.db, authContext, scope, supabase, snatchDb, tigerpathPool);
    },
    {
      onerror: (err) => {
        app.log.error({ err }, "MCP handler error");
      },
    }
  );
  const nodeHandler = toNodeHandler(handler, {
    onerror: (err) => {
      app.log.error({ err }, "MCP adapter error");
    },
  });

  const serve = async (request: FastifyRequest, reply: FastifyReply) => {
    const requestId = (request.headers["x-request-id"] as string | undefined) ?? randomUUID();
    const requiredToken = process.env.MCP_ACCESS_TOKEN?.trim();
    const authHeader = request.headers.authorization;
    const bearerToken = typeof authHeader === "string" ? extractBearerToken(authHeader) : null;

    if (requiredToken && bearerToken !== requiredToken) {
      app.log.warn({ requestId, method: request.method }, "Rejected unauthorized MCP request");
      return reply
        .code(401)
        .send(rpcError(-32001, "Unauthorized: missing or invalid bearer token."));
    }

    reply.hijack();
    try {
      await nodeHandler(request.raw, reply.raw, request.body);
    } catch (err) {
      // The reply is hijacked, so Fastify cannot answer for us — log and drop
      // the connection rather than leaving the client hanging.
      app.log.error({ err, requestId }, "MCP request failed");
      if (!reply.raw.writableEnded) reply.raw.destroy();
    }
  };

  app.post("/", { schema: { hide: true } }, serve);
  app.get("/", { schema: { hide: true } }, serve);
  app.delete("/", { schema: { hide: true } }, serve);

  app.addHook("onClose", async () => {
    await handler.close();
  });
};

export default mcpRoutes;
