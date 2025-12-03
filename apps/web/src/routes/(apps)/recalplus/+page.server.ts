import { CURRENT_TERM_ID } from "$lib/changeme";
import { createClient } from "redis";
import { REDIS_PASSWORD } from "$env/static/private";
import type { CourseData } from "$lib/types/dbTypes";
import type { SectionData } from "$lib/stores/rsections";
import { redirect } from "@sveltejs/kit";
import { type UserCustomEvent } from "$lib/stores/events.js";

// Load course data for default term from Redis
export const load = async ({ locals: { supabase } }) => {
    const {
        data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
        throw redirect(303, "/");
    }
    const userId = user.id;

    const redisClient = createClient({
        password: REDIS_PASSWORD,
        socket: {
            host: "redis-10705.c12.us-east-1-4.ec2.cloud.redislabs.com",
            port: 10705
        }
    });
    redisClient.on("error", err => console.log("Redis Client Error", err));
    await redisClient.connect();

    const supaPromises = [];
    supaPromises.push(redisClient.json.get(`courses-${CURRENT_TERM_ID}`));
    supaPromises.push(redisClient.json.get(`sections-${CURRENT_TERM_ID}`));
    supaPromises.push(
        supabase
            .from("profiles")
            .select("doneFeedback")
            .eq("id", userId)
            .single()
    );
    supaPromises.push(
        supabase
            .from("schedules")
            .select("id, title, display_order")
            .eq("user_id", userId)
            .eq("term", CURRENT_TERM_ID)
            .order("display_order", { ascending: true })
    );
    supaPromises.push(
        supabase
            .from("events")
            .select("id, title, times")
            .eq("user_id", userId)
            .order("id", { ascending: true })
    );
    const [courses, sections, feedback, userSchedulesRaw, events] =
        (await Promise.all(supaPromises)) as any[];

    const doneFeedback = feedback?.data.doneFeedback;
    const userSchedules = userSchedulesRaw.data;

    const userEvents: UserCustomEvent[] = events.data;

    // Create default schedule if none exist
    if (userSchedules.length === 0) {
        const cleaningPromises = [];
        cleaningPromises.push(redisClient.disconnect());
        cleaningPromises.push(
            supabase
                .from("profiles")
                .update({ doneFeedback: true })
                .eq("id", userId)
        );
        cleaningPromises.push(
            supabase
                .from("schedules")
                .insert([
                    {
                        user_id: userId,
                        term: CURRENT_TERM_ID,
                        title: "My Schedule"
                    }
                ])
                .select()
                .single()
        );
        const [_, __, newScheduleRaw] = (await Promise.all(
            cleaningPromises
        )) as any[];
        const newSchedule = newScheduleRaw.data;

        return {
            status: 200,
            body: {
                courses: courses as CourseData[],
                sections: sections as SectionData[],
                schedules: [newSchedule],
                associations: { [newSchedule.id]: [] },
                doneFeedback: doneFeedback as boolean,
                events: userEvents as UserCustomEvent[],
                eventAssociations: {} as Record<number, number[]>
            }
        };
    }

    // Otherwise, fetch course-schedule associations
    const associations: Record<any, any> = {};
    const assocPromises = [];
    assocPromises.push(redisClient.disconnect());
    assocPromises.push(
        supabase
            .from("profiles")
            .update({ doneFeedback: true })
            .eq("id", userId)
    );

    assocPromises.push(
        supabase
            .from("event_schedule_associations")
            .select("event_id, schedule_id")
            .in(
                "schedule_id",
                userSchedules.map((s: { id: number }) => s.id)
            )
    );

    assocPromises.push(
        supabase
            .from("course_schedule_associations")
            .select("course_id, schedule_id, metadata")
            .in(
                "schedule_id",
                userSchedules.map((s: { id: number }) => s.id)
            )
    );

    const [_, __, eventAssocRaw, courseAssocRaw] = (await Promise.all(
        assocPromises
    )) as any[];

    const eventAssociations: Record<number, number[]> = {};
    for (const schedule of userSchedules) {
        eventAssociations[schedule.id] = [];
        if (eventAssocRaw.data) {
            for (const assoc of eventAssocRaw.data) {
                if (assoc.schedule_id === schedule.id) {
                    eventAssociations[schedule.id].push(assoc.event_id);
                }
            }
        }
    }

    for (const assoc of courseAssocRaw.data) {
        if (!associations[assoc.schedule_id]) {
            associations[assoc.schedule_id] = [];
        }
        associations[assoc.schedule_id].push(assoc);
    }

    return {
        status: 200,
        body: {
            courses: courses as CourseData[],
            sections: sections as SectionData[],
            schedules: userSchedules,
            associations,
            doneFeedback: doneFeedback,
            events: userEvents as UserCustomEvent[],
            eventAssociations
        }
    };
};
