import { REDIS_PASSWORD } from "$env/static/private";
import { checkAdmin } from "$lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RequestHandler } from "@sveltejs/kit";
import { createClient } from "redis";

export const GET: RequestHandler = async req => {
    let supabase: SupabaseClient = req.locals.supabase;
    if (!(await checkAdmin(supabase))) throw new Error("User not admin");

    let term = req.params.term;

    // Fetch term data from Supabase
    const FIELDS =
        "id, listing_id, term, code, title, status, basis, dists, rating, num_evals, grading_info, instructors";

    const { data: supaCourses, error: error2 } = await req.locals.supabase
        .from("courses")
        .select(FIELDS)
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

    // const { data, error } = await supabase.functions.invoke("redis-transfer", {
    //     body: { term },
    // });

    // if (error || !data) {
    //     console.log("Line 1");
    //     console.log(error);
    //     return new Response(JSON.stringify(error));
    // }

    return new Response(
        JSON.stringify("Transferred courses for term " + term + " to Redis")
    );
};
