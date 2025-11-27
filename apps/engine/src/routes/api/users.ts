// src/routes/api/users.ts
// Author(s): Joshua Lau

import { type FastifyPluginAsync } from "fastify";
import DB from "../../db/index.js";
import * as schema from "../../db/schema.js";
import { eq, and, asc } from "drizzle-orm";

const usersRoutes: FastifyPluginAsync = async (app) => {
  const db = new DB();

  // POST /api/users/register - Register a new user
  app.post("/register", {
    schema: {
      description: "Register a new user",
      tags: ["Users"],
      body: {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          netid: { type: "string" },
          year: { type: "number", minimum: 1900, maximum: 2100 }
        },
        required: ["email", "netid", "year"]
      },
      response: {
        201: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                id: { type: "number" },
                email: { type: "string" },
                netid: { type: "string" },
                year: { type: "number" },
                isAdmin: { type: "boolean" },
                theme: { type: "object" }
              }
            }
          }
        },
        400: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            error: { type: "string" }
          }
        },
        409: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            error: { type: "string" }
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
    const { email, netid, year } = request.body as {
      email: string;
      netid: string;
      year: number;
    };

    if (!email || !netid || !year) {
      return reply.code(400).send({
        success: false,
        error: "Missing required fields: email, netid, year"
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return reply.code(400).send({
        success: false,
        error: "Invalid email format"
      });
    }

    try {
      // Check if user already exists
      const existingUser = await db.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.netid, netid))
        .limit(1);

      if (existingUser.length > 0) {
        return reply.code(409).send({
          success: false,
          error: "User with this netid already exists"
        });
      }

      // Create new user
      const newUser = await db.db
        .insert(schema.users)
        .values({
          email,
          netid,
          year,
          isAdmin: false,
          theme: {}
        })
        .returning();

      return reply.code(201).send({
        success: true,
        data: newUser[0]
      });
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({
        success: false,
        error: "Failed to register user"
      });
    }
  });

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
