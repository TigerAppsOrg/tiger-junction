// Connect lifecycle: start (send push) -> finish (store session), plus status
// and disconnect. The password is accepted only by /start and is never stored.

import { type FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { handleStellicError } from "./errors.ts";

const startBody = z.object({
  netid: z.string().min(1),
  password: z.string().min(1),
});

const finishBody = z.object({
  connectionToken: z.string().min(1),
  netid: z.string().min(1),
});

const connectRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/start",
    {
      schema: {
        tags: ["Connect"],
        summary: "Sign in to CAS and send the Duo push",
      },
    },
    async (req, reply) => {
      const parsed = startBody.safeParse(req.body);
      if (!parsed.success)
        return reply.code(400).send({ error: "netid and password required" });
      try {
        const { connectionToken, challenge } = await app.service.startConnect(
          parsed.data.netid,
          parsed.data.password,
        );
        return {
          connectionToken,
          device: challenge.device,
          verificationCode: challenge.verificationCode,
          pushNeeded: challenge.pushNeeded,
        };
      } catch (err) {
        return handleStellicError(err, reply);
      }
    },
  );

  app.post(
    "/finish",
    {
      schema: {
        tags: ["Connect"],
        summary:
          "Finish login after the push is approved (202 while still pending)",
      },
    },
    async (req, reply) => {
      const parsed = finishBody.safeParse(req.body);
      if (!parsed.success)
        return reply
          .code(400)
          .send({ error: "connectionToken and netid required" });
      try {
        const { netid } = await app.service.finishConnect(
          parsed.data.connectionToken,
          parsed.data.netid,
        );
        return { netid, status: "active" };
      } catch (err) {
        return handleStellicError(err, reply);
      }
    },
  );

  app.get(
    "/:netid/status",
    {
      schema: { tags: ["Connect"], summary: "Connection status for a student" },
    },
    async (req, reply) => {
      const { netid } = req.params as { netid: string };
      const status = await app.service.status(netid);
      if (!status) return reply.code(404).send({ error: "not connected" });
      return status;
    },
  );

  app.delete(
    "/:netid",
    { schema: { tags: ["Connect"], summary: "Disconnect a student" } },
    async (req) => {
      const { netid } = req.params as { netid: string };
      await app.service.disconnect(netid);
      return { netid, status: "disconnected" };
    },
  );
};

export default connectRoutes;
