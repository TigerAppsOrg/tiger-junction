// Actions the backend can run against a stored session. Read-only for now: the
// demo exposes the student's current courses. Writes would go here too, behind
// the same service-key boundary, once a mutation is captured and vetted.

import { type FastifyPluginAsync } from "fastify";
import { handleStellicError } from "./errors.ts";

const actionRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/:netid/courses",
    {
      schema: {
        tags: ["Actions"],
        summary: "Current-semester courses for a student",
      },
    },
    async (req, reply) => {
      const { netid } = req.params as { netid: string };
      try {
        const courses = await app.service.currentCourses(netid);
        return { netid, courses };
      } catch (err) {
        return handleStellicError(err, reply);
      }
    },
  );
};

export default actionRoutes;
