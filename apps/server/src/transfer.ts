import { createClient } from "redis";
import { supabase } from "./shared";

// Transfer data from Supabase to Redis
export const redisTransfer = async (term: number) => {
    const redisStart = Date.now();

    const redisClient = createClient({
        password: process.env.REDIS_PASSWORD,
        socket: {
            host: "redis-10705.c12.us-east-1-4.ec2.cloud.redislabs.com",
            port: 10705
        }
    });

    const initPromises = [
        supabase
            .from("courses")
            .select("*")
            .eq("term", term)
            .order("code", { ascending: true }),
        supabase
            .from("sections")
            .select("*, courses!inner(term)")
            .eq("courses.term", term)
            .order("id", { ascending: true }),
        redisClient.connect()
    ];

    const [courseRes, sectionsRes] = (await Promise.all(initPromises)) as {
        data: any;
        error: Error | null;
    }[];

    const { data: supaCourses, error: courseError } = courseRes;
    if (courseError) {
        throw new Error(courseError.message);
    }

    const { data: supaSections, error: sectionError } = sectionsRes;
    if (sectionError) {
        throw new Error(sectionError.message);
    }

    supaSections.forEach((section: any) => {
        delete section.courses;
    });

    await redisClient.json.set(`courses-${term}`, "$", supaCourses);
    await redisClient.json.set(`sections-${term}`, "$", supaSections);
    await redisClient.disconnect();

    const redisEnd = Date.now();
    console.log(
        "Finished transferring data to Redis in",
        redisEnd - redisStart,
        "ms"
    );
};
