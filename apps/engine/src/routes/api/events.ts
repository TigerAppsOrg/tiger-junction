// src/routes/api/events.ts
// Author(s): Joshua Lau

import { type FastifyPluginAsync } from "fastify";
import DB from "../../db/index.js";
import * as schema from "../../db/schema.js";
import { eq, and } from "drizzle-orm";

const eventsRoutes: FastifyPluginAsync = async (app) => {
  const db = new DB();

  // POST /api/events - Create a new custom event
  app.post("/", {
    schema: {
      description: "Create a new custom event",
      tags: ["Events"],
      body: {
        type: "object",
        properties: {
          userId: { type: "number" },
          title: { type: "string" },
          times: { type: "object" }
        },
        required: ["userId", "title", "times"]
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
                userId: { type: "number" },
                title: { type: "string" },
                times: { type: "object" }
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
    const { userId, title, times } = request.body as {
      userId: number;
      title: string;
      times: any;
    };

    if (!userId || !title || !times) {
      return reply.code(400).send({
        success: false,
        error: "Missing required fields: userId, title, times"
      });
    }

    try {
      const newEvent = await db.db
        .insert(schema.customEvents)
        .values({
          userId,
          title,
          times
        })
        .returning();

      return reply.code(201).send({
        success: true,
        data: newEvent[0]
      });
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({
        success: false,
        error: "Failed to create event"
      });
    }
  });

  // PATCH /api/events/:eventId - Update a custom event
  app.patch("/:eventId", {
    schema: {
      description: "Update a custom event",
      tags: ["Events"],
      params: {
        type: "object",
        properties: {
          eventId: { type: "number" }
        },
        required: ["eventId"]
      },
      body: {
        type: "object",
        properties: {
          title: { type: "string" },
          times: { type: "object" }
        }
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
                userId: { type: "number" },
                title: { type: "string" },
                times: { type: "object" }
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
    const { eventId } = request.params as { eventId: number };
    const updateData = request.body as {
      title?: string;
      times?: any;
    };

    try {
      const updated = await db.db
        .update(schema.customEvents)
        .set(updateData)
        .where(eq(schema.customEvents.id, eventId))
        .returning();

      if (updated.length === 0) {
        return reply.code(404).send({
          success: false,
          error: "Event not found"
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
        error: "Failed to update event"
      });
    }
  });

  // DELETE /api/events/:eventId - Delete a custom event
  app.delete("/:eventId", {
    schema: {
      description: "Delete a custom event (cascades to delete event-schedule associations)",
      tags: ["Events"],
      params: {
        type: "object",
        properties: {
          eventId: { type: "number" }
        },
        required: ["eventId"]
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
    const { eventId } = request.params as { eventId: number };

    try {
      const deleted = await db.db
        .delete(schema.customEvents)
        .where(eq(schema.customEvents.id, eventId))
        .returning({ id: schema.customEvents.id });

      if (deleted.length === 0) {
        return reply.code(404).send({
          success: false,
          error: "Event not found"
        });
      }

      return reply.code(200).send({
        success: true,
        message: "Event deleted successfully"
      });
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({
        success: false,
        error: "Failed to delete event"
      });
    }
  });

  // GET /api/events/:eventId/schedules - Get event associations for schedules
  app.get("/:eventId/schedules", {
    schema: {
      description: "Get all schedule associations for an event",
      tags: ["Events", "Schedules"],
      params: {
        type: "object",
        properties: {
          eventId: { type: "number" }
        },
        required: ["eventId"]
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
                  scheduleId: { type: "number" },
                  customEventId: { type: "number" }
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
    const { eventId } = request.params as { eventId: number };

    try {
      const associations = await db.db
        .select()
        .from(schema.scheduleEventMap)
        .where(eq(schema.scheduleEventMap.customEventId, eventId));

      return reply.code(200).send({
        success: true,
        count: associations.length,
        data: associations
      });
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({
        success: false,
        error: "Failed to fetch event associations"
      });
    }
  });
};

export default eventsRoutes;
