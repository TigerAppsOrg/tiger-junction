import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { MongoClient, type Db } from "mongodb";

declare module "fastify" {
  interface FastifyInstance {
    snatchDb: Db | null;
  }
}

const snatchDbPlugin: FastifyPluginAsync = async (app) => {
  const uri = process.env.SNATCH_DB_URI?.trim();

  if (!uri) {
    app.log.warn("SNATCH_DB_URI not set — TigerSnatch demand tools disabled.");
    app.decorate("snatchDb", null);
    return;
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db("tigersnatch");

  app.decorate("snatchDb", db);
  app.log.info("TigerSnatch MongoDB connected");

  app.addHook("onClose", async () => {
    await client.close();
  });
};

export default fp(snatchDbPlugin, {
  name: "snatch-db-plugin",
});
