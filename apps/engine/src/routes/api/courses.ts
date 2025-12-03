// src/routes/api/courses.ts
// Author(s): Joshua Lau

import { type FastifyPluginAsync } from "fastify";
import * as schema from "../../db/schema.js";
import { eq, asc } from "drizzle-orm";

const coursesRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/courses/all - Get all courses across all terms with instructors
  app.get(
    "/all",
    {
      schema: {
        description: "Get all courses across all terms with instructor information",
        tags: ["Courses"],
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
                    id: { type: "string" },
                    listingId: { type: "string" },
                    term: { type: "number" },
                    code: { type: "string" },
                    title: { type: "string" },
                    description: { type: "string" },
                    status: { type: "string" },
                    dists: { type: "array", items: { type: "string" }, nullable: true },
                    gradingBasis: { type: "string" },
                    hasFinal: { type: "boolean", nullable: true },
                    instructors: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          netid: { type: "string" },
                          name: { type: "string" },
                          email: { type: "string", nullable: true },
                        },
                      },
                    },
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
      try {
        const cache = app.redis;

        const loader = async () => {
          const rows = await app.db.db
            .select({
              id: schema.courses.id,
              listingId: schema.courses.listingId,
              term: schema.courses.term,
              code: schema.courses.code,
              title: schema.courses.title,
              description: schema.courses.description,
              status: schema.courses.status,
              dists: schema.courses.dists,
              gradingBasis: schema.courses.gradingBasis,
              hasFinal: schema.courses.hasFinal,
              instructorNetid: schema.instructors.netid,
              instructorName: schema.instructors.name,
              instructorEmail: schema.instructors.email,
            })
            .from(schema.courses)
            .leftJoin(
              schema.courseInstructorMap,
              eq(schema.courses.id, schema.courseInstructorMap.courseId)
            )
            .leftJoin(
              schema.instructors,
              eq(schema.courseInstructorMap.instructorId, schema.instructors.netid)
            )
            .orderBy(asc(schema.courses.code));

          const coursesMap = new Map();
          for (const row of rows) {
            if (!coursesMap.has(row.id)) {
              coursesMap.set(row.id, {
                id: row.id,
                listingId: row.listingId,
                term: row.term,
                code: row.code,
                title: row.title,
                description: row.description,
                status: row.status,
                dists: row.dists,
                gradingBasis: row.gradingBasis,
                hasFinal: row.hasFinal,
                instructors: [],
              });
            }

            if (row.instructorNetid) {
              coursesMap.get(row.id).instructors.push({
                netid: row.instructorNetid,
                name: row.instructorName,
                email: row.instructorEmail,
              });
            }
          }

          return Array.from(coursesMap.values());
        };

        if (cache) {
          const courses = await cache.getOrSetJson("courses:all", loader);
          return reply.code(200).send({ success: true, count: courses.length, data: courses });
        }

        // DB fallback
        const courses = await loader();
        return reply.code(200).send({ success: true, count: courses.length, data: courses });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({ success: false, error: "Failed to fetch courses" });
      }
    }
  );

  // GET /api/courses/:term - Get all courses for a specific term with instructors
  app.get(
    "/:term",
    {
      schema: {
        description: "Get all courses for a specific term with instructor information",
        tags: ["Courses"],
        params: {
          type: "object",
          properties: {
            term: { type: "number", description: "Term code (e.g., 1262)" },
          },
          required: ["term"],
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
                    id: { type: "string" },
                    listingId: { type: "string" },
                    term: { type: "number" },
                    code: { type: "string" },
                    title: { type: "string" },
                    description: { type: "string" },
                    status: { type: "string" },
                    dists: { type: "array", items: { type: "string" }, nullable: true },
                    gradingBasis: { type: "string" },
                    hasFinal: { type: "boolean", nullable: true },
                    instructors: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          netid: { type: "string" },
                          name: { type: "string" },
                          email: { type: "string", nullable: true },
                        },
                      },
                    },
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
      const { term } = request.params as { term: number };

      if (!term || isNaN(term)) {
        return reply.code(400).send({
          success: false,
          error: "Invalid term parameter",
        });
      }

      try {
        const cache = app.redis;

        const loader = async () => {
          // Get courses with instructors
          const coursesWithInstructors = await app.db.db
            .select({
              id: schema.courses.id,
              listingId: schema.courses.listingId,
              term: schema.courses.term,
              code: schema.courses.code,
              title: schema.courses.title,
              description: schema.courses.description,
              status: schema.courses.status,
              dists: schema.courses.dists,
              gradingBasis: schema.courses.gradingBasis,
              hasFinal: schema.courses.hasFinal,
              instructorNetid: schema.instructors.netid,
              instructorName: schema.instructors.name,
              instructorEmail: schema.instructors.email,
            })
            .from(schema.courses)
            .leftJoin(
              schema.courseInstructorMap,
              eq(schema.courses.id, schema.courseInstructorMap.courseId)
            )
            .leftJoin(
              schema.instructors,
              eq(schema.courseInstructorMap.instructorId, schema.instructors.netid)
            )
            .where(eq(schema.courses.term, term))
            .orderBy(asc(schema.courses.code));

          // Group instructors by course
          const coursesMap = new Map();
          for (const row of coursesWithInstructors) {
            if (!coursesMap.has(row.id)) {
              coursesMap.set(row.id, {
                id: row.id,
                listingId: row.listingId,
                term: row.term,
                code: row.code,
                title: row.title,
                description: row.description,
                status: row.status,
                dists: row.dists,
                gradingBasis: row.gradingBasis,
                hasFinal: row.hasFinal,
                instructors: [],
              });
            }

            if (row.instructorNetid) {
              coursesMap.get(row.id).instructors.push({
                netid: row.instructorNetid,
                name: row.instructorName,
                email: row.instructorEmail,
              });
            }
          }

          return Array.from(coursesMap.values());
        };

        const cacheKey = `courses:term:${term}`;

        if (cache) {
          const courses = await cache.getOrSetJson(cacheKey, loader);
          return reply.code(200).send({ success: true, count: courses.length, data: courses });
        }

        // DB fallback
        const courses = await loader();
        return reply.code(200).send({ success: true, count: courses.length, data: courses });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({ success: false, error: "Failed to fetch courses" });
      }
    }
  );

  // GET /api/courses/:courseId/sections - Get sections for a specific course
  app.get(
    "/:courseId/sections",
    {
      schema: {
        description: "Get all sections for a specific course",
        tags: ["Courses"],
        params: {
          type: "object",
          properties: {
            courseId: { type: "string", description: "Course ID (e.g., '123-1262')" },
          },
          required: ["courseId"],
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
                    courseId: { type: "string" },
                    title: { type: "string" },
                    num: { type: "string" },
                    room: { type: "string", nullable: true },
                    tot: { type: "number" },
                    cap: { type: "number" },
                    days: { type: "number" },
                    startTime: { type: "number" },
                    endTime: { type: "number" },
                    status: { type: "string" },
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
      const { courseId } = request.params as { courseId: string };

      try {
        const sections = await app.db.db
          .select()
          .from(schema.sections)
          .where(eq(schema.sections.courseId, courseId))
          .orderBy(asc(schema.sections.id));

        return reply.code(200).send({
          success: true,
          count: sections.length,
          data: sections,
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({
          success: false,
          error: "Failed to fetch sections",
        });
      }
    }
  );
};

export default coursesRoutes;
