import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import type RedisCache from "../cache/rediscache.ts";
import RedisCacheClass from "../cache/rediscache.ts";

declare module "fastify" {
    interface FastifyInstance {
        redis: RedisCache;
    }
}

const redisPlugin: FastifyPluginAsync = async (app) => {
    const cache = new RedisCacheClass();

    // Connect at startup; if connect fails, fail fast so deploys notice.
    await cache.connect();

    // Attach to Fastify instance for handlers to use
    app.decorate("redis", cache);

    // Ensure proper cleanup on close (async hook should not use the `done` callback)
    app.addHook("onClose", async (_instance) => {
        try {
            await cache.disconnect();
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error("Error disconnecting Redis:", err);
        }
    });
};

export default fp(redisPlugin, {
    name: "redis-plugin",
});
