// src/main.ts
// Author(s): Joshua Lau

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
      tags: [
        { name: "Health", description: "Health check endpoints" },
        { name: "Courses", description: "Course data endpoints" },
        { name: "Sections", description: "Section data endpoints" },
        { name: "Schedules", description: "Schedule management endpoints" },
        { name: "Users", description: "User-related endpoints" },
        { name: "Events", description: "Custom event endpoints" },
        { name: "Feedback", description: "User feedback endpoints" },
        { name: "Instructors", description: "Instructor data endpoints" },
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

  // Expose raw OpenAPI JSON for external tooling (e.g., Bruno)
  // NOTE: auth should be applied here if your environment requires it.
  app.get("/openapi.json", async (request, reply) => {
    // `app.swagger()` is provided by @fastify/swagger after registration
    // Use `as any` to avoid TypeScript complaints in case types are not merged.
    const spec = (app as any).swagger && (app as any).swagger();
    if (!spec) {
      return reply.code(500).send({ error: "OpenAPI spec not available" });
    }
    return reply.send(spec);
  });
  // Route groups
  // Register Redis plugin so routes can use `app.redis`
  await app.register(redisPlugin);
  app.register(healthRoutes, { prefix: "/health" });
  app.register(coursesRoutes, { prefix: "/api/courses" });
  app.register(sectionsRoutes, { prefix: "/api/sections" });
  app.register(schedulesRoutes, { prefix: "/api/schedules" });
  app.register(usersRoutes, { prefix: "/api/users" });
  app.register(eventsRoutes, { prefix: "/api/events" });
  app.register(feedbackRoutes, { prefix: "/api/feedback" });
  app.register(instructorsRoutes, { prefix: "/api/instructors" });
  return app;
}

const app = await build();

app.listen({ port: 3000 }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
