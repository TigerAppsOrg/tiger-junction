import { REDIS_PASSWORD } from "$env/static/private";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "redis";

export const redisTransfer = async (supabase: SupabaseClient, term: number) => {
    // Transfer data from Supabase to Redis
    const redisStart = Date.now();
    const { data: supaCourses, error: error2 } = await supabase
        .from("courses")
        .select("*")
        .eq("term", term)
        .order("code", { ascending: true });

    if (error2) {
        throw new Error(error2.message);
    }

    const { data: supaSections, error: error3 } = await supabase
        .from("sections")
        .select("*, courses!inner(term)")
        .eq("courses.term", term)
        .order("id", { ascending: true });

    if (error3) {
        throw new Error(error3.message);
    }

    supaSections.forEach(section => {
        delete section.courses;
    });

    // Push term data to Redis
    const redisClient = createClient({
        password: REDIS_PASSWORD,
        socket: {
            host: "redis-10705.c12.us-east-1-4.ec2.cloud.redislabs.com",
            port: 10705
        }
    });

    redisClient.on("error", err => console.log("Redis Client Error", err));

    await redisClient.connect();
    await redisClient.json.set(`courses-${term}`, "$", supaCourses);
    await redisClient.json.set(`sections-${term}`, "$", supaSections);
    await redisClient.disconnect();

    const redisEnd = Date.now();
    console.log(
        "Finished transferring data to Redis for term",
        term,
        "in",
        (redisEnd - redisStart) / 1000,
        "s"
    );
};
