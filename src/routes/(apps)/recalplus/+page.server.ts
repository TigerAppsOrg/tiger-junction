import { CURRENT_TERM_ID } from "$lib/constants";
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
    const courses = await redisClient.json.get(`courses-${CURRENT_TERM_ID}`);
    const sections = await redisClient.json.get(`sections-${CURRENT_TERM_ID}`);
    await redisClient.disconnect();

    if (!courses) return { status: 500, body: "Error fetching courses" };
    if (!sections) return { status: 500, body: "Error fetching sections" };

    const session = await getSession();
    const userId = session?.user.id;
    const { data: userSchedules, error: userScheduleFetchError } = await supabase
        .from("schedules")
        .select("id, title")
        .eq("user_id", userId)
        .eq("term", CURRENT_TERM_ID)
        .order("id", { ascending: true });

    if (userScheduleFetchError) return { status: 500, body: "Error fetching user schedules" };
    
    // Create default schedule if none exist
    if (userSchedules.length === 0) {
        const { data: newSchedule, error: newScheduleError } = await supabase
        .from("schedules")
        .insert([{ user_id: userId, CURRENT_TERM_ID, title: "My Schedule" }])
        .select()
        .single();

        if (newScheduleError) return { status: 500, body: "Error creating new schedule" };

        return {
            status: 200,
            body: {
                courses: courses as CourseData[],
                sections: sections as SectionData[],
                schedules: [newSchedule],
                associations: { [newSchedule.id]: [] }
            }
        }
    }

    // Otherwise, fetch course-schedule associations
    const associations: Record<any, any> = {};
    for (const schedule of userSchedules) {
        const { data: assoc, error: assocFetchError } = await supabase
            .from("course_schedule_associations")
            .select("course_id, metadata")
            .eq("schedule_id", schedule.id)
        
        if (assocFetchError) return { status: 500, body: "Error fetching course-schedule associations" };
        associations[schedule.id] = assoc;
    }

    console.log({
        courses: courses as CourseData[],
        sections: sections as SectionData[],
        schedules: userSchedules,
        associations
    })

    return {
        status: 200,
        body: {
            courses: courses as CourseData[],
            sections: sections as SectionData[],
            schedules: userSchedules,
            associations
        }
    }
};