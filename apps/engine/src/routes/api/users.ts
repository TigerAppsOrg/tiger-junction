// src/routes/api/users.ts
// Author(s): Joshua Lau

import { type FastifyPluginAsync } from "fastify";
import DB from "../../db/index.js";
import * as schema from "../../db/schema.js";
import { eq, and, asc } from "drizzle-orm";

const usersRoutes: FastifyPluginAsync = async (app) => {
  const db = new DB();

  // GET /api/users/:userId/schedules - Get user's schedules (optionally filtered by term)
  app.get("/:userId/schedules", {
    schema: {
      description: "Get all schedules for a user, optionally filtered by term",
      tags: ["Users", "Schedules"],
      params: {
        type: "object",
        properties: {
          userId: { type: "number" }
        },
        required: ["userId"]
      },
      querystring: {
        type: "object",
        properties: {
          term: { type: "number", description: "Optional term filter" }
        }
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            count: { type: "number" },
            data: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "number" },
                  relativeId: { type: "number" },
                  userId: { type: "number" },
                  title: { type: "string" },
                  isPublic: { type: "boolean" },
                  term: { type: "number" }
                }
              }
            }
          }
        },
        500: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            error: { type: "string" }
          }
        }
      }
    }
  }, async (request, reply) => {
    // TODO: Add authentication/authorization check
    const { userId } = request.params as { userId: number };
    const { term } = request.query as { term?: number };

    try {
      const whereConditions = term
        ? and(
          eq(schema.schedules.userId, userId),
          eq(schema.schedules.term, term)
        )
        : eq(schema.schedules.userId, userId);

      const schedules = await db.db
        .select()
        .from(schema.schedules)
        .where(whereConditions)
        .orderBy(asc(schema.schedules.id));

      return reply.code(200).send({
        success: true,
        count: schedules.length,
        data: schedules
      });
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({
        success: false,
        error: "Failed to fetch user schedules"
      });
    }
  });

  // GET /api/users/:userId/events - Get user's custom events
  app.get("/:userId/events", {
    schema: {
      description: "Get all custom events for a user",
      tags: ["Users", "Events"],
      params: {
        type: "object",
        properties: {
          userId: { type: "number" }
        },
        required: ["userId"]
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            count: { type: "number" },
            data: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "number" },
                  userId: { type: "number" },
                  title: { type: "string" },
                  times: { type: "object" }
                }
              }
            }
          }
        },
        500: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            error: { type: "string" }
          }
        }
      }
    }
  }, async (request, reply) => {
    // TODO: Add authentication/authorization check
    const { userId } = request.params as { userId: number };

    try {
      const events = await db.db
        .select()
        .from(schema.customEvents)
        .where(eq(schema.customEvents.userId, userId))
        .orderBy(asc(schema.customEvents.id));

      return reply.code(200).send({
        success: true,
        count: events.length,
        data: events
      });
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({
        success: false,
        error: "Failed to fetch user events"
      });
    }
  });
};

export default usersRoutes;
