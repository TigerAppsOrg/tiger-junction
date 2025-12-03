import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import DB from "../db/index.js";

declare module "fastify" {
  interface FastifyInstance {
    db: DB;
  }
}

const dbPlugin: FastifyPluginAsync = async (app) => {
  const db = new DB();

  // Test connection at startup; fail fast if database is unreachable
  await db.testConnection();

  // Attach to Fastify instance for handlers to use
  app.decorate("db", db);
};

export default fp(dbPlugin, {
  name: "db-plugin",
});
