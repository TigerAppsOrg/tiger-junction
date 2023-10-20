import { CURRENT_TERM_ID } from "$lib/constants";
import { createClient } from "redis";
import { REDIS_PASSWORD } from "$env/static/private";
import type { CourseData } from "$lib/types/dbTypes";

// Load course data for default term from Redis
export const load = async () => {
    const redisClient = createClient({
        password: REDIS_PASSWORD,
        socket: {
            host: 'redis-10705.c12.us-east-1-4.ec2.cloud.redislabs.com',
            port: 10705
        }
    });
    
    redisClient.on("error", err => console.log("Redis Client Error", err));
    await redisClient.connect();
    const data = await redisClient.json.get(`courses-${CURRENT_TERM_ID}`);
    await redisClient.disconnect();

    if (!data) return { status: 500, body: "Error fetching courses" };

    return {
        status: 200,
        body: data as CourseData[]
    }
};