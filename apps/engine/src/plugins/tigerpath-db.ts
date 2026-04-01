import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { Pool } from "pg";

declare module "fastify" {
  interface FastifyInstance {
    tigerpathPool: Pool;
  }
}

const tigerpathDbPlugin: FastifyPluginAsync = async (app) => {
  const url = process.env.TIGERPATH_POSTGRES_URL?.trim();
  if (!url) {
    app.log.info("TIGERPATH_POSTGRES_URL not set — TigerPath tools will be unavailable");
    return;
  }

  const pool = new Pool({
    connectionString: url,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: url.includes("rds.amazonaws.com") ? { rejectUnauthorized: false } : undefined,
  });

  // Verify connectivity at startup
  const client = await pool.connect();
  client.release();
  app.log.info("TigerPath database connection successful");

  app.decorate("tigerpathPool", pool);

  app.addHook("onClose", async () => {
    await pool.end();
  });
};

export default fp(tigerpathDbPlugin, { name: "tigerpath-db-plugin" });
