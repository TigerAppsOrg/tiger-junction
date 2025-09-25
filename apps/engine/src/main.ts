import Fastify, { type FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import sensible from "@fastify/sensible";

import healthRoutes from "./routes/health.ts";

function build(): FastifyInstance {
  const app = Fastify({ logger: true });

  // Global plugins (apply everywhere)
  app.register(
    fp(async (app) => {
      await app.register(sensible);
    })
  );

  // Route groups
  app.register(healthRoutes, { prefix: "/health" });

  return app;
}

const app = build();

app.listen({ port: 3000 }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
