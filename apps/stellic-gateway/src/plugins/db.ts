import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import DB from "../db/index.ts";

declare module "fastify" {
  interface FastifyInstance {
    db: DB;
  }
}

const dbPlugin: FastifyPluginAsync = async (app) => {
  const db = new DB();
  await db.testConnection();
  app.decorate("db", db);
};

export default fp(dbPlugin, { name: "db-plugin" });
