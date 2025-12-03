// src/routes/api/schedules.ts
// Author(s): Sai Nallani '29

import { type FastifyPluginAsync } from "fastify";
import * as schema from "../../db/schema.js";
import { eq, and } from "drizzle-orm";

const schedulesRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/schedules/:scheduleId - Get a specific schedule
  app.get(
    "/:scheduleId",
    {
      schema: {
        description: "Get a specific schedule by ID",
        tags: ["Schedules"],
        params: {
          type: "object",
          properties: {
            scheduleId: { type: "number" },
          },
          required: ["scheduleId"],
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
                  term: { type: "number" },
                },
              },
            },
          },
          404: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
            },
          },
          500: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      // TODO: Add authentication/authorization check
      const { scheduleId } = request.params as { scheduleId: number };

      try {
        const schedule = await app.db.db
          .select()
          .from(schema.schedules)
          .where(eq(schema.schedules.id, scheduleId))
          .limit(1);

        if (schedule.length === 0) {
          return reply.code(404).send({
            success: false,
            error: "Schedule not found",
          });
        }

        return reply.code(200).send({
          success: true,
          data: schedule[0],
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({
          success: false,
          error: "Failed to fetch schedule",
        });
      }
    }
  );

  // POST /api/schedules - Create a new schedule
  app.post(
    "/",
    {
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
            isPublic: { type: "boolean" },
          },
          required: ["userId", "term", "title", "relativeId"],
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
                  term: { type: "number" },
                },
              },
            },
          },
          400: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
            },
          },
          500: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
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
          error: "Missing required fields: userId, term, title, relativeId",
        });
      }

      try {
        const newSchedule = await app.db.db
          .insert(schema.schedules)
          .values({
            userId,
            term,
            title,
            relativeId,
            isPublic: isPublic ?? false,
          })
          .returning();

        return reply.code(201).send({
          success: true,
          data: newSchedule[0],
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({
          success: false,
          error: "Failed to create schedule",
        });
      }
    }
  );

  // PATCH /api/schedules/:scheduleId - Update schedule title
  app.patch(
    "/:scheduleId",
    {
      schema: {
        description: "Update a schedule's title",
        tags: ["Schedules"],
        params: {
          type: "object",
          properties: {
            scheduleId: { type: "number" },
          },
          required: ["scheduleId"],
        },
        body: {
          type: "object",
          properties: {
            title: { type: "string" },
          },
          required: ["title"],
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
                  title: { type: "string" },
                },
              },
            },
          },
          400: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
            },
          },
          404: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
            },
          },
          500: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      // TODO: Add authentication/authorization check
      const { scheduleId } = request.params as { scheduleId: number };
      const { title } = request.body as { title: string };

      if (!title) {
        return reply.code(400).send({
          success: false,
          error: "Title is required",
        });
      }

      try {
        const updated = await app.db.db
          .update(schema.schedules)
          .set({ title })
          .where(eq(schema.schedules.id, scheduleId))
          .returning({ id: schema.schedules.id, title: schema.schedules.title });

        if (updated.length === 0) {
          return reply.code(404).send({
            success: false,
            error: "Schedule not found",
          });
        }

        return reply.code(200).send({
          success: true,
          data: updated[0],
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({
          success: false,
          error: "Failed to update schedule",
        });
      }
    }
  );

  // DELETE /api/schedules/:scheduleId - Delete a schedule
  app.delete(
    "/:scheduleId",
    {
      schema: {
        description: "Delete a schedule (cascades to delete associated courses/events)",
        tags: ["Schedules"],
        params: {
          type: "object",
          properties: {
            scheduleId: { type: "number" },
          },
          required: ["scheduleId"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
          404: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
            },
          },
          500: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      // TODO: Add authentication/authorization check
      const { scheduleId } = request.params as { scheduleId: number };

      try {
        const deleted = await app.db.db
          .delete(schema.schedules)
          .where(eq(schema.schedules.id, scheduleId))
          .returning({ id: schema.schedules.id });

        if (deleted.length === 0) {
          return reply.code(404).send({
            success: false,
            error: "Schedule not found",
          });
        }

        return reply.code(200).send({
          success: true,
          message: "Schedule deleted successfully",
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({
          success: false,
          error: "Failed to delete schedule",
        });
      }
    }
  );

  // GET /api/schedules/:scheduleId/courses - Get course associations for a schedule
  app.get(
    "/:scheduleId/courses",
    {
      schema: {
        description: "Get all course associations for a schedule",
        tags: ["Schedules", "Courses"],
        params: {
          type: "object",
          properties: {
            scheduleId: { type: "number" },
          },
          required: ["scheduleId"],
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
                    courseId: { type: "string" },
                    color: { type: "number" },
                    isComplete: { type: "boolean" },
                    confirms: { type: "object" },
                  },
                },
              },
            },
          },
          500: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      // TODO: Add authentication/authorization check
      const { scheduleId } = request.params as { scheduleId: number };

      try {
        const associations = await app.db.db
          .select()
          .from(schema.scheduleCourseMap)
          .where(eq(schema.scheduleCourseMap.scheduleId, scheduleId));

        return reply.code(200).send({
          success: true,
          count: associations.length,
          data: associations,
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({
          success: false,
          error: "Failed to fetch course associations",
        });
      }
    }
  );

  // POST /api/schedules/:scheduleId/courses - Add a course to a schedule
  app.post(
    "/:scheduleId/courses",
    {
      schema: {
        description: "Add a course to a schedule",
        tags: ["Schedules", "Courses"],
        params: {
          type: "object",
          properties: {
            scheduleId: { type: "number" },
          },
          required: ["scheduleId"],
        },
        body: {
          type: "object",
          properties: {
            courseId: { type: "string" },
            color: { type: "number" },
            isComplete: { type: "boolean" },
            confirms: { type: "object" },
          },
          required: ["courseId"],
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
                  courseId: { type: "string" },
                  color: { type: "number" },
                  isComplete: { type: "boolean" },
                  confirms: { type: "object" },
                },
              },
            },
          },
          400: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
            },
          },
          500: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      // TODO: Add authentication/authorization check
      const { scheduleId } = request.params as { scheduleId: number };
      const { courseId, color, isComplete, confirms } = request.body as {
        courseId: string;
        color?: number;
        isComplete?: boolean;
        confirms?: Record<string, string>;
      };

      if (!courseId) {
        return reply.code(400).send({
          success: false,
          error: "courseId is required",
        });
      }

      try {
        const newAssociation = await app.db.db
          .insert(schema.scheduleCourseMap)
          .values({
            scheduleId,
            courseId,
            color: color ?? 0,
            isComplete: isComplete ?? false,
            confirms: confirms ?? {},
          })
          .returning();

        return reply.code(201).send({
          success: true,
          data: newAssociation[0],
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({
          success: false,
          error: "Failed to add course to schedule",
        });
      }
    }
  );

  // POST /api/schedules/:scheduleId/courses/bulk - Bulk add courses to a schedule
  app.post(
    "/:scheduleId/courses/bulk",
    {
      schema: {
        description: "Bulk add multiple courses to a schedule",
        tags: ["Schedules", "Courses"],
        params: {
          type: "object",
          properties: {
            scheduleId: { type: "number" },
          },
          required: ["scheduleId"],
        },
        body: {
          type: "object",
          properties: {
            courses: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  courseId: { type: "string" },
                  color: { type: "number" },
                  isComplete: { type: "boolean" },
                  confirms: { type: "object" },
                },
                required: ["courseId"],
              },
            },
          },
          required: ["courses"],
        },
        response: {
          201: {
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
                    courseId: { type: "string" },
                    color: { type: "number" },
                    isComplete: { type: "boolean" },
                    confirms: { type: "object" },
                  },
                },
              },
            },
          },
          400: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
            },
          },
          500: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      // TODO: Add authentication/authorization check
      const { scheduleId } = request.params as { scheduleId: number };
      const { courses } = request.body as {
        courses: Array<{
          courseId: string;
          color?: number;
          isComplete?: boolean;
          confirms?: Record<string, string>;
        }>;
      };

      if (!courses || courses.length === 0) {
        return reply.code(400).send({
          success: false,
          error: "courses array is required and cannot be empty",
        });
      }

      try {
        const associations = courses.map((course) => ({
          scheduleId,
          courseId: course.courseId,
          color: course.color ?? 0,
          isComplete: course.isComplete ?? false,
          confirms: course.confirms ?? {},
        }));

        const inserted = await app.db.db
          .insert(schema.scheduleCourseMap)
          .values(associations)
          .returning();

        return reply.code(201).send({
          success: true,
          count: inserted.length,
          data: inserted,
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({
          success: false,
          error: "Failed to bulk add courses to schedule",
        });
      }
    }
  );

  // PATCH /api/schedules/:scheduleId/courses/:courseId - Update course metadata
  app.patch(
    "/:scheduleId/courses/:courseId",
    {
      schema: {
        description: "Update course metadata (section selections)",
        tags: ["Schedules", "Courses"],
        params: {
          type: "object",
          properties: {
            scheduleId: { type: "number" },
            courseId: { type: "string" },
          },
          required: ["scheduleId", "courseId"],
        },
        body: {
          type: "object",
          properties: {
            color: { type: "number" },
            isComplete: { type: "boolean" },
            confirms: { type: "object" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "object",
                properties: {
                  scheduleId: { type: "number" },
                  courseId: { type: "string" },
                  color: { type: "number" },
                  isComplete: { type: "boolean" },
                  confirms: { type: "object" },
                },
              },
            },
          },
          404: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
            },
          },
          500: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      // TODO: Add authentication/authorization check
      const { scheduleId, courseId } = request.params as { scheduleId: number; courseId: string };
      const updateData = request.body as {
        color?: number;
        isComplete?: boolean;
        confirms?: Record<string, string>;
      };

      try {
        const updated = await app.db.db
          .update(schema.scheduleCourseMap)
          .set(updateData)
          .where(
            and(
              eq(schema.scheduleCourseMap.scheduleId, scheduleId),
              eq(schema.scheduleCourseMap.courseId, courseId)
            )
          )
          .returning();

        if (updated.length === 0) {
          return reply.code(404).send({
            success: false,
            error: "Course association not found",
          });
        }

        return reply.code(200).send({
          success: true,
          data: updated[0],
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({
          success: false,
          error: "Failed to update course metadata",
        });
      }
    }
  );

  // DELETE /api/schedules/:scheduleId/courses/:courseId - Remove a course from schedule
  app.delete(
    "/:scheduleId/courses/:courseId",
    {
      schema: {
        description: "Remove a course from a schedule",
        tags: ["Schedules", "Courses"],
        params: {
          type: "object",
          properties: {
            scheduleId: { type: "number" },
            courseId: { type: "string" },
          },
          required: ["scheduleId", "courseId"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
          404: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
            },
          },
          500: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      // TODO: Add authentication/authorization check
      const { scheduleId, courseId } = request.params as { scheduleId: number; courseId: string };

      try {
        const deleted = await app.db.db
          .delete(schema.scheduleCourseMap)
          .where(
            and(
              eq(schema.scheduleCourseMap.scheduleId, scheduleId),
              eq(schema.scheduleCourseMap.courseId, courseId)
            )
          )
          .returning();

        if (deleted.length === 0) {
          return reply.code(404).send({
            success: false,
            error: "Course association not found",
          });
        }

        return reply.code(200).send({
          success: true,
          message: "Course removed from schedule",
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({
          success: false,
          error: "Failed to remove course from schedule",
        });
      }
    }
  );

  // DELETE /api/schedules/:scheduleId/courses - Clear all courses from schedule
  app.delete(
    "/:scheduleId/courses",
    {
      schema: {
        description: "Clear all courses from a schedule",
        tags: ["Schedules", "Courses"],
        params: {
          type: "object",
          properties: {
            scheduleId: { type: "number" },
          },
          required: ["scheduleId"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              count: { type: "number" },
            },
          },
          500: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      // TODO: Add authentication/authorization check
      const { scheduleId } = request.params as { scheduleId: number };

      try {
        const deleted = await app.db.db
          .delete(schema.scheduleCourseMap)
          .where(eq(schema.scheduleCourseMap.scheduleId, scheduleId))
          .returning();

        return reply.code(200).send({
          success: true,
          message: "All courses cleared from schedule",
          count: deleted.length,
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({
          success: false,
          error: "Failed to clear courses from schedule",
        });
      }
    }
  );

  // GET /api/schedules/:scheduleId/events - Get event associations for a schedule
  app.get(
    "/:scheduleId/events",
    {
      schema: {
        description: "Get all event associations for a schedule",
        tags: ["Schedules", "Events"],
        params: {
          type: "object",
          properties: {
            scheduleId: { type: "number" },
          },
          required: ["scheduleId"],
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
                    customEventId: { type: "number" },
                  },
                },
              },
            },
          },
          500: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      // TODO: Add authentication/authorization check
      const { scheduleId } = request.params as { scheduleId: number };

      try {
        const associations = await app.db.db
          .select()
          .from(schema.scheduleEventMap)
          .where(eq(schema.scheduleEventMap.scheduleId, scheduleId));

        return reply.code(200).send({
          success: true,
          count: associations.length,
          data: associations,
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({
          success: false,
          error: "Failed to fetch event associations",
        });
      }
    }
  );

  // POST /api/schedules/:scheduleId/events - Add an event to a schedule
  app.post(
    "/:scheduleId/events",
    {
      schema: {
        description: "Add an event to a schedule",
        tags: ["Schedules", "Events"],
        params: {
          type: "object",
          properties: {
            scheduleId: { type: "number" },
          },
          required: ["scheduleId"],
        },
        body: {
          type: "object",
          properties: {
            eventId: { type: "number" },
          },
          required: ["eventId"],
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
                  customEventId: { type: "number" },
                },
              },
            },
          },
          400: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
            },
          },
          500: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      // TODO: Add authentication/authorization check
      const { scheduleId } = request.params as { scheduleId: number };
      const { eventId } = request.body as { eventId: number };

      if (!eventId) {
        return reply.code(400).send({
          success: false,
          error: "eventId is required",
        });
      }

      try {
        const newAssociation = await app.db.db
          .insert(schema.scheduleEventMap)
          .values({
            scheduleId,
            customEventId: eventId,
          })
          .returning();

        return reply.code(201).send({
          success: true,
          data: newAssociation[0],
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({
          success: false,
          error: "Failed to add event to schedule",
        });
      }
    }
  );

  // DELETE /api/schedules/:scheduleId/events/:eventId - Remove an event from schedule
  app.delete(
    "/:scheduleId/events/:eventId",
    {
      schema: {
        description: "Remove an event from a schedule",
        tags: ["Schedules", "Events"],
        params: {
          type: "object",
          properties: {
            scheduleId: { type: "number" },
            eventId: { type: "number" },
          },
          required: ["scheduleId", "eventId"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
          404: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
            },
          },
          500: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      // TODO: Add authentication/authorization check
      const { scheduleId, eventId } = request.params as { scheduleId: number; eventId: number };

      try {
        const deleted = await app.db.db
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
            error: "Event association not found",
          });
        }

        return reply.code(200).send({
          success: true,
          message: "Event removed from schedule",
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({
          success: false,
          error: "Failed to remove event from schedule",
        });
      }
    }
  );

  // DELETE /api/schedules/:scheduleId/events - Clear all events from schedule
  app.delete(
    "/:scheduleId/events",
    {
      schema: {
        description: "Clear all events from a schedule",
        tags: ["Schedules", "Events"],
        params: {
          type: "object",
          properties: {
            scheduleId: { type: "number" },
          },
          required: ["scheduleId"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              count: { type: "number" },
            },
          },
          500: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      // TODO: Add authentication/authorization check
      const { scheduleId } = request.params as { scheduleId: number };

      try {
        const deleted = await app.db.db
          .delete(schema.scheduleEventMap)
          .where(eq(schema.scheduleEventMap.scheduleId, scheduleId))
          .returning();

        return reply.code(200).send({
          success: true,
          message: "All events cleared from schedule",
          count: deleted.length,
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({
          success: false,
          error: "Failed to clear events from schedule",
        });
      }
    }
  );
};

export default schedulesRoutes;
