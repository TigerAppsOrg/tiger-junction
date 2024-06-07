import { REDIS_PASSWORD } from "$env/static/private";
import type { RequestHandler } from "@sveltejs/kit";
import { createClient } from "redis";

export const GET: RequestHandler = async req => {
    // Check if user is authenticated
    const {
        data: { user }
    } = await req.locals.supabase.auth.getUser();
    if (!user) throw new Error("User not logged in");

    let term = req.params.term as string;

    // Fetch course data from Redis
    const redisClient = createClient({
        password: REDIS_PASSWORD,
        socket: {
            host: "redis-10705.c12.us-east-1-4.ec2.cloud.redislabs.com",
            port: 10705
        }
    });

    redisClient.on("error", err => console.log("Redis Client Error", err));

    await redisClient.connect();

    const data = await redisClient.json.get(`courses-${term}`);
    await redisClient.disconnect();

    return new Response(JSON.stringify(data));
};
