// src/routes/api/evaluations.ts
// Author(s): Ibraheem Amin

import { type FastifyPluginAsync } from "fastify";
import * as schema from "../../db/schema.js";
import { eq, asc } from "drizzle-orm";

const evaluationsRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/evaluations - Get all evaluations
  app.get(
    "/",
    {
      schema: {
        description: "Get all course evaluations",
        tags: ["Evaluations"],
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
                    numComments: { type: "number", nullable: true },
                    comments: {
                      type: "array",
                      items: { type: "string" },
                      nullable: true,
                    },
                    summary: { type: "string", nullable: true },
                    rating: { type: "number", nullable: true },
                    ratingSource: { type: "string", nullable: true },
                    metadata: {
                      type: "object",
                      additionalProperties: true,
                      nullable: true,
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
      try {
        const evals = await app.db.db
          .select()
          .from(schema.evaluations)
          .orderBy(asc(schema.evaluations.courseId));

        return reply.code(200).send({
          success: true,
          count: evals.length,
          data: evals,
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({
          success: false,
          error: "Failed to fetch evaluations",
        });
      }
    }
  );

  // GET /api/evaluations/:courseId - Get evaluations for a specific course
  app.get(
    "/:courseId",
    {
      schema: {
        description: "Get evaluations for a specific course by course ID",
        tags: ["Evaluations"],
        params: {
          type: "object",
          properties: {
            courseId: {
              type: "string",
              description: "Course ID (e.g., '002051-1252')",
            },
          },
          required: ["courseId"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "object",
                nullable: true,
                properties: {
                  id: { type: "number" },
                  courseId: { type: "string" },
                  numComments: { type: "number", nullable: true },
                  comments: {
                    type: "array",
                    items: { type: "string" },
                    nullable: true,
                  },
                  summary: { type: "string", nullable: true },
                  rating: { type: "number", nullable: true },
                  ratingSource: { type: "string", nullable: true },
                  metadata: {
                    type: "object",
                    additionalProperties: true,
                    nullable: true,
                  },
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
      const { courseId } = request.params as { courseId: string };

      try {
        const results = await app.db.db
          .select()
          .from(schema.evaluations)
          .where(eq(schema.evaluations.courseId, courseId));

        if (results.length === 0) {
          return reply.code(404).send({
            success: false,
            error: `No evaluations found for course ${courseId}`,
          });
        }

        return reply.code(200).send({
          success: true,
          data: results[0],
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({
          success: false,
          error: "Failed to fetch evaluations",
        });
      }
    }
  );
};

export default evaluationsRoutes;
