import { CURRENT_TERM_ID } from "$lib/changeme";
import { createClient } from "redis";
import { REDIS_PASSWORD } from "$env/static/private";
import type { CourseData } from "$lib/types/dbTypes";
import type { SectionData } from "$lib/stores/rsections";

// Load course data for default term from Redis
export const load = async ({ locals: { getSession, supabase } }) => {
    const redisClient = createClient({
        password: REDIS_PASSWORD,
        socket: {
            host: 'redis-10705.c12.us-east-1-4.ec2.cloud.redislabs.com',
            port: 10705
        }
    });
    
    redisClient.on("error", err => console.log("Redis Client Error", err));

    await redisClient.connect();
    const session = await getSession();

    const userId = session?.user.id;

    const supaPromises = [];
    supaPromises.push(redisClient.json.get(`courses-${CURRENT_TERM_ID}`));
    supaPromises.push(redisClient.json.get(`sections-${CURRENT_TERM_ID}`));
    supaPromises.push(supabase.from("profiles").select("doneFeedback").eq("id", userId).single());
    supaPromises.push(supabase.from("schedules").select("id, title").eq("user_id", userId).eq("term", CURRENT_TERM_ID).order("id", { ascending: true }));
    const [courses, sections, feedback, userSchedulesRaw] = await Promise.all(supaPromises);

    const doneFeedback = feedback?.data.doneFeedback;
    const userSchedules = userSchedulesRaw.data;

    // Create default schedule if none exist
    if (userSchedules.length === 0) {
        const cleaningPromises = [];
        cleaningPromises.push(redisClient.disconnect());
        cleaningPromises.push(supabase.from("profiles").update({ doneFeedback: true }).eq("id", userId));
        cleaningPromises.push(supabase.from("schedules").insert([{ user_id: userId, term: CURRENT_TERM_ID, title: "My Schedule" }]).select().single());
        const [_, __, newScheduleRaw] = await Promise.all(cleaningPromises);
        const newSchedule = newScheduleRaw.data;

        return {
            status: 200,
            body: {
                courses: courses as CourseData[],
                sections: sections as SectionData[],
                schedules: [newSchedule],
                associations: { [newSchedule.id]: [] },
                doneFeedback: doneFeedback
            }
        }
    }

    // Otherwise, fetch course-schedule associations
    const associations: Record<any, any> = {};
    const assocPromises = [];
    assocPromises.push(redisClient.disconnect());
    assocPromises.push(supabase.from("profiles").update({ doneFeedback: true }).eq("id", userId));
    for (const schedule of userSchedules) {
        assocPromises.push(supabase
            .from("course_schedule_associations")
            .select("course_id, metadata")
            .eq("schedule_id", schedule.id)
        );
    }

    const [_, __, ...assocResults] = await Promise.all(assocPromises);
    for (let i = 0; i < assocResults.length; i++) {
        associations[userSchedules[i].id] = assocResults[i].data;
    }
    
    return {
        status: 200,
        body: {
            courses: courses as CourseData[],
            sections: sections as SectionData[],
            schedules: userSchedules,
            associations,
            doneFeedback: doneFeedback
        }
    }
};