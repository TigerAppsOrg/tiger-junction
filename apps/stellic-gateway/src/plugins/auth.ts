// Service-to-service auth. Every route except /health and /docs requires the
// shared key TigerJunction's backend sends as `Authorization: Bearer <SERVICE_API_KEY>`.
//
// This is a trust boundary between two backend services, not end-user auth: the
// gateway assumes the caller has already authenticated the student and is
// authorized to act for the netid it passes.

import fp from "fastify-plugin";
import { createHash, timingSafeEqual } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";

const PUBLIC_PREFIXES = ["/health", "/docs"];

function isPublic(url: string): boolean {
  const path = url.split("?", 1)[0];
  return PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

// Comparing fixed-length digests keeps the check constant-time without leaking
// the key's length.
function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

const authPlugin: FastifyPluginAsync = async (app) => {
  const expected = process.env.SERVICE_API_KEY;
  if (!expected) throw new Error("SERVICE_API_KEY is not set");
  const expectedDigest = digest(expected);

  app.addHook("onRequest", async (req, reply) => {
    if (isPublic(req.url)) return;

    const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization ?? "");
    if (!match || !timingSafeEqual(digest(match[1]), expectedDigest)) {
      return reply.code(401).send({ error: "unauthorized" });
    }
  });
};

export default fp(authPlugin, { name: "auth-plugin" });
