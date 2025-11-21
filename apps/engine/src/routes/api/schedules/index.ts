// src/routes/api/schedules/index.ts
// Author(s): Joshua Lau

import { type FastifyPluginAsync } from "fastify";
import DB from "../../../db/index.js";
import * as schema from "../../../db/schema.js";
import { eq } from "drizzle-orm";

const schedulesRoutes: FastifyPluginAsync = async (app) => {
  const db = new DB();

  // GET /api/schedules/:scheduleId - Get a specific schedule
  app.get("/:scheduleId", {
    schema: {
      description: "Get a specific schedule by ID",
      tags: ["Schedules"],
      params: {
        type: "object",
        properties: {
          scheduleId: { type: "number" }
        },
        required: ["scheduleId"]
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
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
        },
        404: {
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
    // TODO: Add authentication/authorization check
    const { scheduleId } = request.params as { scheduleId: number };

    try {
      const schedule = await db.db
        .select()
        .from(schema.schedules)
        .where(eq(schema.schedules.id, scheduleId))
        .limit(1);

      if (schedule.length === 0) {
        return reply.code(404).send({
          success: false,
          error: "Schedule not found"
        });
      }

      return reply.code(200).send({
        success: true,
        data: schedule[0]
      });
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({
        success: false,
        error: "Failed to fetch schedule"
      });
    }
  });

  // POST /api/schedules - Create a new schedule
  app.post("/", {
    schema: {
      description: "Create a new schedule",
      tags: ["Schedules"],
      body: {
        type: "object",
        properties: {
          userId: { type: "number" },
          term: { type: "number" },
          title: { type: "string" },
          relativeId: { type: "number" },
          isPublic: { type: "boolean" }
        },
        required: ["userId", "term", "title", "relativeId"]
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
                relativeId: { type: "number" },
                userId: { type: "number" },
                title: { type: "string" },
                isPublic: { type: "boolean" },
                term: { type: "number" }
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
    const { userId, term, title, relativeId, isPublic } = request.body as {
      userId: number;
      term: number;
      title: string;
      relativeId: number;
      isPublic?: boolean;
    };

    if (!userId || !term || !title || relativeId === undefined) {
      return reply.code(400).send({
        success: false,
        error: "Missing required fields: userId, term, title, relativeId"
      });
    }

    try {
      const newSchedule = await db.db
        .insert(schema.schedules)
        .values({
          userId,
          term,
          title,
          relativeId,
          isPublic: isPublic ?? false
        })
        .returning();

      return reply.code(201).send({
        success: true,
        data: newSchedule[0]
      });
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({
        success: false,
        error: "Failed to create schedule"
      });
    }
  });

  // PATCH /api/schedules/:scheduleId - Update schedule title
  app.patch("/:scheduleId", {
    schema: {
      description: "Update a schedule's title",
      tags: ["Schedules"],
      params: {
        type: "object",
        properties: {
          scheduleId: { type: "number" }
        },
        required: ["scheduleId"]
      },
      body: {
        type: "object",
        properties: {
          title: { type: "string" }
        },
        required: ["title"]
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                id: { type: "number" },
                title: { type: "string" }
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
        404: {
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
    // TODO: Add authentication/authorization check
    const { scheduleId } = request.params as { scheduleId: number };
    const { title } = request.body as { title: string };

    if (!title) {
      return reply.code(400).send({
        success: false,
        error: "Title is required"
      });
    }

    try {
      const updated = await db.db
        .update(schema.schedules)
        .set({ title })
        .where(eq(schema.schedules.id, scheduleId))
        .returning({ id: schema.schedules.id, title: schema.schedules.title });

      if (updated.length === 0) {
        return reply.code(404).send({
          success: false,
          error: "Schedule not found"
        });
      }

      return reply.code(200).send({
        success: true,
        data: updated[0]
      });
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({
        success: false,
        error: "Failed to update schedule"
      });
    }
  });

  // DELETE /api/schedules/:scheduleId - Delete a schedule
  app.delete("/:scheduleId", {
    schema: {
      description: "Delete a schedule (cascades to delete associated courses/events)",
      tags: ["Schedules"],
      params: {
        type: "object",
        properties: {
          scheduleId: { type: "number" }
        },
        required: ["scheduleId"]
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" }
          }
        },
        404: {
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
    // TODO: Add authentication/authorization check
    const { scheduleId } = request.params as { scheduleId: number };

    try {
      const deleted = await db.db
        .delete(schema.schedules)
        .where(eq(schema.schedules.id, scheduleId))
        .returning({ id: schema.schedules.id });

      if (deleted.length === 0) {
        return reply.code(404).send({
          success: false,
          error: "Schedule not found"
        });
      }

      return reply.code(200).send({
        success: true,
        message: "Schedule deleted successfully"
      });
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({
        success: false,
        error: "Failed to delete schedule"
      });
    }
  });
};

export default schedulesRoutes;
