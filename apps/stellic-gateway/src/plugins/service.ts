import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { ConnectionService } from "../service.ts";
import { loadSealKey } from "../crypto/seal.ts";

declare module "fastify" {
  interface FastifyInstance {
    service: ConnectionService;
  }
}

// Depends on the db plugin, so register it after dbPlugin.
const servicePlugin: FastifyPluginAsync = async (app) => {
  const sealKey = loadSealKey(process.env.SESSION_SEAL_KEY);
  const timeoutMs = Number(process.env.HTTP_TIMEOUT_MS ?? 30000);
  app.decorate("service", new ConnectionService(app.db, sealKey, timeoutMs));
};

export default fp(servicePlugin, {
  name: "service-plugin",
  dependencies: ["db-plugin"],
});
