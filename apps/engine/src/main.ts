// src/main.ts
// Author(s): Joshua Lau

import Fastify, { type FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import sensible from "@fastify/sensible";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import healthRoutes from "./routes/health.ts";

async function build(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  // Global plugins (apply everywhere)
  app.register(
    fp(async (app) => {
      await app.register(sensible);
    })
  );

  // Swagger documentation
  await app.register(swagger, {
    openapi: {
      openapi: "3.0.0",
      info: {
        title: "Engine API",
        version: "1.0.0",
        description: "API documentation for the TigerJunction Engine (backend)",
      },
      servers: [{ url: "http://localhost:3000", description: "Local server" }],
      tags: [{ name: "Health", description: "Health check endpoints" }],
    },
  });

  await app.register(swaggerUI, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "full",
      deepLinking: false,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  // Route groups
  app.register(healthRoutes, { prefix: "/health" });

  return app;
}

const app = await build();

app.listen({ port: 3000 }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
