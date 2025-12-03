// src/routes/api/instructors.ts
// Author(s): Sai Nallani '29

import { type FastifyPluginAsync } from "fastify";
import * as schema from "../../db/schema.js";
import { asc, eq } from "drizzle-orm";

const instructorsRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/instructors - Get all instructors
  app.get(
    "/",
    {
      schema: {
        description: "Get all instructors",
        tags: ["Instructors"],
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
                    netid: { type: "string" },
                    emplid: { type: "string" },
                    name: { type: "string" },
                    fullName: { type: "string" },
                    department: { type: "string", nullable: true },
                    email: { type: "string", nullable: true },
                    office: { type: "string", nullable: true },
                    rating: { type: "number", nullable: true },
                    ratingUncertainty: { type: "number", nullable: true },
                    numRatings: { type: "number", nullable: true },
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
        const instructors = await app.db.db
          .select()
          .from(schema.instructors)
          .orderBy(asc(schema.instructors.name));

        return reply.code(200).send({
          success: true,
          count: instructors.length,
          data: instructors,
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({
          success: false,
          error: "Failed to fetch instructors",
        });
      }
    }
  );

  // GET /api/instructors/:netid - Get a specific instructor
  app.get(
    "/:netid",
    {
      schema: {
        description: "Get a specific instructor by netid",
        tags: ["Instructors"],
        params: {
          type: "object",
          properties: {
            netid: { type: "string" },
          },
          required: ["netid"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "object",
                properties: {
                  netid: { type: "string" },
                  emplid: { type: "string" },
                  name: { type: "string" },
                  fullName: { type: "string" },
                  department: { type: "string", nullable: true },
                  email: { type: "string", nullable: true },
                  office: { type: "string", nullable: true },
                  rating: { type: "number", nullable: true },
                  ratingUncertainty: { type: "number", nullable: true },
                  numRatings: { type: "number", nullable: true },
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
      const { netid } = request.params as { netid: string };

      try {
        const instructor = await app.db.db
          .select()
          .from(schema.instructors)
          .where(eq(schema.instructors.netid, netid))
          .limit(1);

        if (instructor.length === 0) {
          return reply.code(404).send({
            success: false,
            error: "Instructor not found",
          });
        }

        return reply.code(200).send({
          success: true,
          data: instructor[0],
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({
          success: false,
          error: "Failed to fetch instructor",
        });
      }
    }
  );
};

export default instructorsRoutes;
