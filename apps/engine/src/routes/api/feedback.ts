// src/routes/api/feedback.ts
// Author(s): Joshua Lau

import { type FastifyPluginAsync } from "fastify";
import DB from "../../db/index.js";
import * as schema from "../../db/schema.js";

const feedbackRoutes: FastifyPluginAsync = async (app) => {
  const db = new DB();

  // POST /api/feedback - Submit feedback
  app.post("/", {
    schema: {
      description: "Submit user feedback",
      tags: ["Feedback"],
      body: {
        type: "object",
        properties: {
          userId: { type: "number" },
          feedback: { type: "string" }
        },
        required: ["userId", "feedback"]
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
                feedback: { type: "string" },
                isResolved: { type: "boolean" },
                createdAt: { type: "string" }
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
    const { userId, feedback: feedbackText } = request.body as {
      userId: number;
      feedback: string;
    };

    if (!userId || !feedbackText) {
      return reply.code(400).send({
        success: false,
        error: "Missing required fields: userId, feedback"
      });
    }

    try {
      const newFeedback = await db.db
        .insert(schema.feedback)
        .values({
          userId,
          feedback: feedbackText
        })
        .returning();

      return reply.code(201).send({
        success: true,
        data: newFeedback[0]
      });
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({
        success: false,
        error: "Failed to submit feedback"
      });
    }
  });
};

export default feedbackRoutes;
