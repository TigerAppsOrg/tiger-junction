// src/routes/snatch.ts
// Author(s): Angela Cai

import { type FastifyPluginAsync } from "fastify";

const snatchRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/add_to_waitlist/:netid/:classid",
    {
      schema: {
        tags: ["Snatch"],
        summary: "Adds user to waitlist",
        description: "Adds user to waitlist",
        response: {
          200: {
            description: "Added user to waitlist successfully",
            type: "object",
            properties: {
              netid: { type: "string", example: "ab1234" },
              classid: { type: "string", example: "12345" },
              success: { type: "boolean", example: true },
              message: { type: "string" },
            },
          },
          400: {
            description: "Add user to waitlist unsuccessful",
            type: "object",
            properties: {
              netid: { type: "string", example: "ab1234" },
              classid: { type: "string", example: "12345" },
              success: { type: "boolean", example: false },
              message: { type: "string" },
            },
          },
          500: {
            description: "Server error",
            type: "object",
            properties: {
              netid: { type: "string", example: "ab1234" },
              classid: { type: "string", example: "12345" },
              success: { type: "boolean", example: false },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { netid, classid } = request.params as { netid: string; classid: string };
      const token = process.env.SNATCH_TOKEN;
      const url = process.env.SNATCH_URL;
      if (!token || !url) {
        return reply.code(500).send({
          netid,
          classid,
          success: false,
          message: "Environmental variable error",
        });
      }
      const response = await fetch(`${url}/junction/add_to_waitlist/${netid}/${classid}`, {
        method: "POST",
        headers: {
          Authorization: token,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        return reply.code(500).send({
          netid,
          classid,
          success: false,
          message: "Server error",
        });
      }

      if (data && data.isSuccess !== 1) {
        return reply.code(400).send({
          netid,
          classid,
          success: false,
          message: `Upstream returned isSuccess=${data.isSuccess}`,
        });
      }

      return reply.code(200).send({
        netid,
        classid,
        success: true,
        message: "Successfully added to waitlist",
      });
    }
  );

  app.post(
    "/junction/remove_from_waitlist/:netid/:classid",
    {
      schema: {
        tags: ["Snatch"],
        summary: "Removes user from waitlist",
        description: "Removes user from waitlist",
        response: {
          200: {
            description: "Removed user from waitlist successfully",
            type: "object",
            properties: {
              netid: { type: "string", example: "ab1234" },
              classid: { type: "string", example: "12345" },
              success: { type: "boolean", example: true },
              message: { type: "string" },
            },
          },
          400: {
            description: "Remove user from waitlist unsuccessful",
            type: "object",
            properties: {
              netid: { type: "string", example: "ab1234" },
              classid: { type: "string", example: "12345" },
              success: { type: "boolean", example: false },
              message: { type: "string" },
            },
          },
          500: {
            description: "Server error",
            type: "object",
            properties: {
              netid: { type: "string", example: "ab1234" },
              classid: { type: "string", example: "12345" },
              success: { type: "boolean", example: false },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { netid, classid } = request.params as { netid: string; classid: string };
      const token = process.env.SNATCH_TOKEN;
      const url = process.env.SNATCH_URL;
      if (!token || !url) {
        return reply.code(500).send({
          netid,
          classid,
          success: false,
          message: "Environmental variable error",
        });
      }
      const response = await fetch(`${url}/junction/remove_from_waitlist/${netid}/${classid}`, {
        method: "POST",
        headers: {
          Authorization: token,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        return reply.code(500).send({
          netid,
          classid,
          success: false,
          message: "Server error",
        });
      }
      if (data && !data.isSuccess) {
        return reply.code(400).send({
          netid,
          classid,
          success: false,
          message: `Upstream returned isSuccess=${data.isSuccess}`,
        });
      }
      return reply.code(200).send({
        netid,
        classid,
        success: true,
        message: "Successfully removed from waitlist",
      });
    }
  );

  app.post(
    "/get_user_data/:netid",
    {
      schema: {
        tags: ["Snatch"],
        summary: "Gets user's waitlists",
        description: "Gets user's class notifications waitlist",
        response: {
          200: {
            description: "User data retrived successfully",
            type: "object",
            properties: {
              netid: { type: "string", example: "ab1234" },
              success: { type: "boolean", example: true },
              message: { type: "string" },
            },
          },
          400: {
            description: "Get user data unsuccessful",
            type: "object",
            properties: {
              netid: { type: "string", example: "ab1234" },
              success: { type: "boolean", example: false },
              message: { type: "string" },
            },
          },
          500: {
            description: "Server error",
            type: "object",
            properties: {
              netid: { type: "string", example: "ab1234" },
              success: { type: "boolean", example: false },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { netid } = request.params as { netid: string };
      const token = process.env.SNATCH_TOKEN;
      const url = process.env.SNATCH_URL;
      if (!token || !url) {
        return reply.code(500).send({
          netid,
          success: false,
          message: "Environment variable error",
        });
      }
      const response = await fetch(`${url}/junction/get_user_data/${netid}`, {
        method: "POST",
        headers: {
          Authorization: token,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        return reply.code(500).send({
          netid,
          success: false,
          message: data.message || "Server error",
        });
      }
      if (data && data.data == "missing") {
        return reply.code(400).send({
          netid,
          success: false,
          message: data.message || `Upstream returned data=${data.data}`,
        });
      }
      return reply.code(200).send({
        netid,
        success: true,
        message: "Successfully got user data",
      });
    }
  );
};

export default snatchRoutes;
