// src/app.ts
// Builds and returns the Fastify application instance.
// Extracted from main.ts so tests can import `build()` without starting the server.

import Fastify, { type FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import sensible from "@fastify/sensible";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import healthRoutes from "./routes/health.ts";
import coursesRoutes from "./routes/api/courses.ts";
import sectionsRoutes from "./routes/api/sections.ts";
import schedulesRoutes from "./routes/api/schedules.ts";
import usersRoutes from "./routes/api/users.ts";
import eventsRoutes from "./routes/api/events.ts";
import feedbackRoutes from "./routes/api/feedback.ts";
import instructorsRoutes from "./routes/api/instructors.ts";
import redisPlugin from "./plugins/redis.ts";
import dbPlugin from "./plugins/db.ts";
import snatchRoutes from "./routes/snatch.ts";

export async function build(opts?: { logger?: boolean }): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts?.logger ?? true });

  app.register(
    fp(async (app) => {
      await app.register(sensible);
    })
  );

  await app.register(swagger, {
    openapi: {
      openapi: "3.0.0",
      info: {
        title: "Engine API",
        version: "1.0.0",
        description: "API documentation for the TigerJunction Engine (backend)",
      },
      servers: [{ url: "http://localhost:3000", description: "Local server" }],
      tags: [
        { name: "Health", description: "Health check endpoints" },
        { name: "Courses", description: "Course data endpoints" },
        { name: "Sections", description: "Section data endpoints" },
        { name: "Schedules", description: "Schedule management endpoints" },
        { name: "Users", description: "User-related endpoints" },
        { name: "Events", description: "Custom event endpoints" },
        { name: "Feedback", description: "User feedback endpoints" },
        { name: "Instructors", description: "Instructor data endpoints" },
        { name: "Snatch", description: "TigerSnatch integration endpoints" },
      ],
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

  app.get("/openapi.json", async (request, reply) => {
    const spec = app.swagger && app.swagger();
    if (!spec) {
      return reply.code(500).send({ error: "OpenAPI spec not available" });
    }
    return reply.send(spec);
  });

  await app.register(dbPlugin);
  await app.register(redisPlugin);

  app.register(healthRoutes, { prefix: "/health" });
  app.register(coursesRoutes, { prefix: "/api/courses" });
  app.register(sectionsRoutes, { prefix: "/api/sections" });
  app.register(schedulesRoutes, { prefix: "/api/schedules" });
  app.register(usersRoutes, { prefix: "/api/users" });
  app.register(eventsRoutes, { prefix: "/api/events" });
  app.register(feedbackRoutes, { prefix: "/api/feedback" });
  app.register(instructorsRoutes, { prefix: "/api/instructors" });
  app.register(snatchRoutes, { prefix: "/snatch" });

  return app;
}
