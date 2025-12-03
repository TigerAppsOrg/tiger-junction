// src/routes/api/sections.ts
// Author(s): Sai Nallani '29

import { type FastifyPluginAsync } from "fastify";
import * as schema from "../../db/schema.js";
import { eq, asc } from "drizzle-orm";

const sectionsRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/sections/:term - Get all sections for a specific term
  app.get(
    "/:term",
    {
      schema: {
        description: "Get all sections for a specific term",
        tags: ["Sections"],
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
        // Get all sections for courses in the specified term
        const sections = await app.db.db
          .select({
            id: schema.sections.id,
            courseId: schema.sections.courseId,
            title: schema.sections.title,
            num: schema.sections.num,
            room: schema.sections.room,
            tot: schema.sections.tot,
            cap: schema.sections.cap,
            days: schema.sections.days,
            startTime: schema.sections.startTime,
            endTime: schema.sections.endTime,
            status: schema.sections.status,
          })
          .from(schema.sections)
          .innerJoin(schema.courses, eq(schema.sections.courseId, schema.courses.id))
          .where(eq(schema.courses.term, term))
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

export default sectionsRoutes;
