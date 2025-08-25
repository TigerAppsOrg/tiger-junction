import Fastify from "fastify";

const fastify = Fastify({
  logger: true,
});

fastify.route({
  method: "GET",
  url: "/health",
  schema: {
    response: {
      200: {
        description: "Health check successful",
        type: "object",
        properties: {
          status: { type: "string" },
        },
      },
    },
  },
  handler: (request, reply) => {
    reply.send({ status: "ok" });
  },
});

try {
  await fastify.listen({ port: 3000 });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
