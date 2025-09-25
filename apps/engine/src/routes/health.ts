// src/routes/health.ts
import { type FastifyPluginAsync } from "fastify";

const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/",
    {
      schema: {
        response: {
          200: {
            description: "Health check successful",
            type: "object",
            properties: { status: { type: "string" } },
          },
        },
      },
    },
    async () => ({ status: "ok" })
  );
};

export default healthRoutes;
