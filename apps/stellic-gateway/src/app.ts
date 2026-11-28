// Builds and returns the Fastify app. Extracted from main.ts so tests can import
// build() without starting the server (mirrors the engine app).

import Fastify, { type FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import dbPlugin from "./plugins/db.ts";
import servicePlugin from "./plugins/service.ts";
import authPlugin from "./plugins/auth.ts";
import healthRoutes from "./routes/health.ts";
import connectRoutes from "./routes/connect.ts";
import actionRoutes from "./routes/actions.ts";

export interface BuildOptions {
  logger?: boolean;
  /** Skip db/service plugins for unit tests that don't touch a database. */
  withDataPlugins?: boolean;
}

export async function build(opts: BuildOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? true });

  await app.register(swagger, {
    openapi: {
      openapi: "3.0.0",
      info: {
        title: "Stellic Gateway API",
        version: "1.0.0",
        description:
          "Internal service that connects a Princeton student's Stellic account and " +
          "keeps the session alive on TigerJunction's behalf.",
      },
      tags: [
        { name: "Health", description: "Health checks" },
        { name: "Connect", description: "Connect lifecycle" },
        { name: "Actions", description: "Operations on a stored session" },
      ],
    },
  });
  await app.register(swaggerUI, { routePrefix: "/docs" });

  await app.register(authPlugin);

  if (opts.withDataPlugins ?? true) {
    await app.register(dbPlugin);
    await app.register(servicePlugin);
  }

  app.register(healthRoutes, { prefix: "/health" });
  app.register(connectRoutes, { prefix: "/connect" });
  app.register(actionRoutes, { prefix: "/actions" });

  return app;
}
