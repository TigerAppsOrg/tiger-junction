// src/routes/health.ts
// Author(s): Joshua Lau

import { type FastifyPluginAsync } from "fastify";
import os from "os";

const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/",
    {
      schema: {
        tags: ["Health"],
        summary: "Basic health check",
        description: "Returns the health status of the API",
        response: {
          200: {
            description: "Health check successful",
            type: "object",
            properties: {
              status: { type: "string", example: "ok" },
              timestamp: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
    async () => ({
      status: "ok",
      timestamp: new Date().toISOString(),
    })
  );

  app.get(
    "/detailed",
    {
      schema: {
        tags: ["Health"],
        summary: "Detailed health check",
        description: "Returns detailed health information including system metrics",
        response: {
          200: {
            description: "Detailed health check successful",
            type: "object",
            properties: {
              status: { type: "string", example: "ok" },
              timestamp: { type: "string", format: "date-time" },
              uptime: { type: "number", description: "Server uptime in seconds" },
              memory: {
                type: "object",
                properties: {
                  heapUsedMB: { type: "number" },
                  heapTotalMB: { type: "number" },
                  rssMB: { type: "number", description: "Resident Set Size (total memory)" },
                  systemFreeMB: { type: "number" },
                  systemTotalMB: { type: "number" },
                },
              },
              environment: { type: "string", example: "development" },
              nodeVersion: { type: "string" },
              platform: { type: "string" },
            },
          },
        },
      },
    },
    async () => {
      const memUsage = process.memoryUsage();

      return {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: Math.round(process.uptime()),
        memory: {
          heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
          rssMB: Math.round(memUsage.rss / 1024 / 1024),
          systemFreeMB: Math.round(os.freemem() / 1024 / 1024),
          systemTotalMB: Math.round(os.totalmem() / 1024 / 1024),
        },
        environment: process.env.NODE_ENV || "development",
        nodeVersion: process.version,
        platform: `${os.platform()} ${os.arch()}`,
      };
    }
  );
};

export default healthRoutes;
