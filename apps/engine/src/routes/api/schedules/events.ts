// src/routes/api/schedules/events.ts
// Author(s): Joshua Lau

import { type FastifyPluginAsync } from "fastify";
import DB from "../../../db/index.js";
import * as schema from "../../../db/schema.js";
import { eq, and } from "drizzle-orm";

const scheduleEventsRoutes: FastifyPluginAsync = async (app) => {
  const db = new DB();

  // GET /api/schedules/:scheduleId/events - Get event associations for a schedule
  app.get("/:scheduleId/events", {
    schema: {
      description: "Get all event associations for a schedule",
      tags: ["Schedules", "Events"],
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
    const { scheduleId } = request.params as { scheduleId: number };

    try {
      const associations = await db.db
        .select()
        .from(schema.scheduleEventMap)
        .where(eq(schema.scheduleEventMap.scheduleId, scheduleId));

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

  // POST /api/schedules/:scheduleId/events - Add an event to a schedule
  app.post("/:scheduleId/events", {
    schema: {
      description: "Add an event to a schedule",
      tags: ["Schedules", "Events"],
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
          eventId: { type: "number" }
        },
        required: ["eventId"]
      },
      response: {
        201: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                scheduleId: { type: "number" },
                customEventId: { type: "number" }
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
    const { scheduleId } = request.params as { scheduleId: number };
    const { eventId } = request.body as { eventId: number };

    if (!eventId) {
      return reply.code(400).send({
        success: false,
        error: "eventId is required"
      });
    }

    try {
      const newAssociation = await db.db
        .insert(schema.scheduleEventMap)
        .values({
          scheduleId,
          customEventId: eventId
        })
        .returning();

      return reply.code(201).send({
        success: true,
        data: newAssociation[0]
      });
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({
        success: false,
        error: "Failed to add event to schedule"
      });
    }
  });

  // DELETE /api/schedules/:scheduleId/events/:eventId - Remove an event from schedule
  app.delete("/:scheduleId/events/:eventId", {
    schema: {
      description: "Remove an event from a schedule",
      tags: ["Schedules", "Events"],
      params: {
        type: "object",
        properties: {
          scheduleId: { type: "number" },
          eventId: { type: "number" }
        },
        required: ["scheduleId", "eventId"]
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
    const { scheduleId, eventId } = request.params as { scheduleId: number; eventId: number };

    try {
      const deleted = await db.db
        .delete(schema.scheduleEventMap)
        .where(
          and(
            eq(schema.scheduleEventMap.scheduleId, scheduleId),
            eq(schema.scheduleEventMap.customEventId, eventId)
          )
        )
        .returning();

      if (deleted.length === 0) {
        return reply.code(404).send({
          success: false,
          error: "Event association not found"
        });
      }

      return reply.code(200).send({
        success: true,
        message: "Event removed from schedule"
      });
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({
        success: false,
        error: "Failed to remove event from schedule"
      });
    }
  });

  // DELETE /api/schedules/:scheduleId/events - Clear all events from schedule
  app.delete("/:scheduleId/events", {
    schema: {
      description: "Clear all events from a schedule",
      tags: ["Schedules", "Events"],
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
            message: { type: "string" },
            count: { type: "number" }
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
        .delete(schema.scheduleEventMap)
        .where(eq(schema.scheduleEventMap.scheduleId, scheduleId))
        .returning();

      return reply.code(200).send({
        success: true,
        message: "All events cleared from schedule",
        count: deleted.length
      });
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({
        success: false,
        error: "Failed to clear events from schedule"
      });
    }
  });
};

export default scheduleEventsRoutes;
