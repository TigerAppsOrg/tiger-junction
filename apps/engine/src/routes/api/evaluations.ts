// src/routes/api/evaluations.ts
// Author(s): Ibraheem Amin

import { type FastifyPluginAsync } from "fastify";
import * as schema from "../../db/schema.js";
import { eq, asc } from "drizzle-orm";

const evalResponseSchema = {
  type: "object",
  properties: {
    id: { type: "number" },
    listingId: { type: "string" },
    evalTerm: { type: "string" },
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
};

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
                items: evalResponseSchema,
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
          .orderBy(asc(schema.evaluations.listingId));

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

  // GET /api/evaluations/:listingId - Get all evaluations for a course listing
  app.get(
    "/:listingId",
    {
      schema: {
        description:
          "Get all evaluations for a course listing across all terms",
        tags: ["Evaluations"],
        params: {
          type: "object",
          properties: {
            listingId: {
              type: "string",
              description: "Course listing ID (e.g., '002051')",
            },
          },
          required: ["listingId"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              count: { type: "number" },
              data: {
                type: "array",
                items: evalResponseSchema,
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
      const { listingId } = request.params as { listingId: string };

      try {
        const results = await app.db.db
          .select()
          .from(schema.evaluations)
          .where(eq(schema.evaluations.listingId, listingId))
          .orderBy(asc(schema.evaluations.evalTerm));

        if (results.length === 0) {
          return reply.code(404).send({
            success: false,
            error: `No evaluations found for listing ${listingId}`,
          });
        }

        return reply.code(200).send({
          success: true,
          count: results.length,
          data: results,
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
