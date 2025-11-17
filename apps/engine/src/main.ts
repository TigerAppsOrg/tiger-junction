// src/main.ts
// Author(s): Joshua Lau

import Fastify from "fastify";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUI from "@fastify/swagger-ui";
import fastifySensible from "@fastify/sensible";
import fastifyWebsocket from "@fastify/websocket";
import dotenv from "dotenv";

// Import route handlers
import healthRoutes from "./routes/health.js";
import coursesRoutes from "./routes/api/courses.js";
import eventsRoutes from "./routes/api/events.js";
import feedbackRoutes from "./routes/api/feedback.js";
import instructorsRoutes from "./routes/api/instructors.js";
import schedulesRoutes from "./routes/api/schedules/index.js";
import scheduleCoursesRoutes from "./routes/api/schedules/courses.js";
import scheduleEventsRoutes from "./routes/api/schedules/events.js";
import sectionsRoutes from "./routes/api/sections.js";
import usersRoutes from "./routes/api/users.js";

// Load environment variables
dotenv.config();

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
    transport:
      process.env.NODE_ENV === "development"
        ? {
            target: "pino-pretty",
            options: {
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
            },
          }
        : undefined,
  },
});

// Register plugins
await app.register(fastifySensible);
await app.register(fastifyWebsocket);

// Register Swagger documentation
await app.register(fastifySwagger, {
  openapi: {
    info: {
      title: "Tiger Junction API",
      description: "API documentation for Tiger Junction course management system",
      version: "1.0.0",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
    tags: [
      { name: "Health", description: "Health check endpoints" },
      { name: "Courses", description: "Course management endpoints" },
      { name: "Events", description: "Event management endpoints" },
      { name: "Feedback", description: "User feedback endpoints" },
      { name: "Instructors", description: "Instructor information endpoints" },
      { name: "Schedules", description: "Schedule management endpoints" },
      { name: "Sections", description: "Course section endpoints" },
      { name: "Users", description: "User management endpoints" },
    ],
  },
});

await app.register(fastifySwaggerUI, {
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: "list",
    deepLinking: true,
  },
});

// Register routes
await app.register(healthRoutes, { prefix: "/health" });
await app.register(coursesRoutes, { prefix: "/api/courses" });
await app.register(eventsRoutes, { prefix: "/api/events" });
await app.register(feedbackRoutes, { prefix: "/api/feedback" });
await app.register(instructorsRoutes, { prefix: "/api/instructors" });
await app.register(schedulesRoutes, { prefix: "/api/schedules" });
await app.register(scheduleCoursesRoutes, { prefix: "/api/schedules" });
await app.register(scheduleEventsRoutes, { prefix: "/api/schedules" });
await app.register(sectionsRoutes, { prefix: "/api/sections" });
await app.register(usersRoutes, { prefix: "/api/users" });

// Add an endpoint to get the OpenAPI JSON
app.get("/openapi.json", async () => {
  return app.swagger();
});

// Start the server
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

try {
  await app.listen({ port: PORT, host: HOST });
  console.log(`Server is running on http://${HOST}:${PORT}`);
  console.log(`API documentation available at http://${HOST}:${PORT}/docs`);
  console.log(`OpenAPI spec available at http://${HOST}:${PORT}/openapi.json`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
