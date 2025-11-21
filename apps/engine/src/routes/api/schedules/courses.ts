// src/routes/api/schedules/courses.ts
// Author(s): Joshua Lau

import { type FastifyPluginAsync } from "fastify";
import DB from "../../../db/index.js";
import * as schema from "../../../db/schema.js";
import { eq, and } from "drizzle-orm";

const scheduleCoursesRoutes: FastifyPluginAsync = async (app) => {
  const db = new DB();

  // GET /api/schedules/:scheduleId/courses - Get course associations for a schedule
  app.get("/:scheduleId/courses", {
    schema: {
      description: "Get all course associations for a schedule",
      tags: ["Schedules", "Courses"],
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
                  courseId: { type: "string" },
                  color: { type: "number" },
                  isComplete: { type: "boolean" },
                  confirms: { type: "object" }
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
        .from(schema.scheduleCourseMap)
        .where(eq(schema.scheduleCourseMap.scheduleId, scheduleId));

      return reply.code(200).send({
        success: true,
        count: associations.length,
        data: associations
      });
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({
        success: false,
        error: "Failed to fetch course associations"
      });
    }
  });

  // POST /api/schedules/:scheduleId/courses - Add a course to a schedule
  app.post("/:scheduleId/courses", {
    schema: {
      description: "Add a course to a schedule",
      tags: ["Schedules", "Courses"],
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
          courseId: { type: "string" },
          color: { type: "number" },
          isComplete: { type: "boolean" },
          confirms: { type: "object" }
        },
        required: ["courseId"]
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
                confirms: { type: "object" }
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
    const { courseId, color, isComplete, confirms } = request.body as {
      courseId: string;
      color?: number;
      isComplete?: boolean;
      confirms?: Record<string, string>;
    };

    if (!courseId) {
      return reply.code(400).send({
        success: false,
        error: "courseId is required"
      });
    }

    try {
      const newAssociation = await db.db
        .insert(schema.scheduleCourseMap)
        .values({
          scheduleId,
          courseId,
          color: color ?? 0,
          isComplete: isComplete ?? false,
          confirms: confirms ?? {}
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
        error: "Failed to add course to schedule"
      });
    }
  });

  // POST /api/schedules/:scheduleId/courses/bulk - Bulk add courses to a schedule
  app.post("/:scheduleId/courses/bulk", {
    schema: {
      description: "Bulk add multiple courses to a schedule",
      tags: ["Schedules", "Courses"],
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
          courses: {
            type: "array",
            items: {
              type: "object",
              properties: {
                courseId: { type: "string" },
                color: { type: "number" },
                isComplete: { type: "boolean" },
                confirms: { type: "object" }
              },
              required: ["courseId"]
            }
          }
        },
        required: ["courses"]
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
                  confirms: { type: "object" }
                }
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
        error: "courses array is required and cannot be empty"
      });
    }

    try {
      const associations = courses.map(course => ({
        scheduleId,
        courseId: course.courseId,
        color: course.color ?? 0,
        isComplete: course.isComplete ?? false,
        confirms: course.confirms ?? {}
      }));

      const inserted = await db.db
        .insert(schema.scheduleCourseMap)
        .values(associations)
        .returning();

      return reply.code(201).send({
        success: true,
        count: inserted.length,
        data: inserted
      });
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({
        success: false,
        error: "Failed to bulk add courses to schedule"
      });
    }
  });

  // PATCH /api/schedules/:scheduleId/courses/:courseId - Update course metadata
  app.patch("/:scheduleId/courses/:courseId", {
    schema: {
      description: "Update course metadata (section selections)",
      tags: ["Schedules", "Courses"],
      params: {
        type: "object",
        properties: {
          scheduleId: { type: "number" },
          courseId: { type: "string" }
        },
        required: ["scheduleId", "courseId"]
      },
      body: {
        type: "object",
        properties: {
          color: { type: "number" },
          isComplete: { type: "boolean" },
          confirms: { type: "object" }
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
                scheduleId: { type: "number" },
                courseId: { type: "string" },
                color: { type: "number" },
                isComplete: { type: "boolean" },
                confirms: { type: "object" }
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
    const { scheduleId, courseId } = request.params as { scheduleId: number; courseId: string };
    const updateData = request.body as {
      color?: number;
      isComplete?: boolean;
      confirms?: Record<string, string>;
    };

    try {
      const updated = await db.db
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
          error: "Course association not found"
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
        error: "Failed to update course metadata"
      });
    }
  });

  // DELETE /api/schedules/:scheduleId/courses/:courseId - Remove a course from schedule
  app.delete("/:scheduleId/courses/:courseId", {
    schema: {
      description: "Remove a course from a schedule",
      tags: ["Schedules", "Courses"],
      params: {
        type: "object",
        properties: {
          scheduleId: { type: "number" },
          courseId: { type: "string" }
        },
        required: ["scheduleId", "courseId"]
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
    const { scheduleId, courseId } = request.params as { scheduleId: number; courseId: string };

    try {
      const deleted = await db.db
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
          error: "Course association not found"
        });
      }

      return reply.code(200).send({
        success: true,
        message: "Course removed from schedule"
      });
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({
        success: false,
        error: "Failed to remove course from schedule"
      });
    }
  });

  // DELETE /api/schedules/:scheduleId/courses - Clear all courses from schedule
  app.delete("/:scheduleId/courses", {
    schema: {
      description: "Clear all courses from a schedule",
      tags: ["Schedules", "Courses"],
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
        .delete(schema.scheduleCourseMap)
        .where(eq(schema.scheduleCourseMap.scheduleId, scheduleId))
        .returning();

      return reply.code(200).send({
        success: true,
        message: "All courses cleared from schedule",
        count: deleted.length
      });
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({
        success: false,
        error: "Failed to clear courses from schedule"
      });
    }
  });
};

export default scheduleCoursesRoutes;
