import { currentSchedule, rawCourseData, schedules, searchCourseData } from "$lib/stores/recal";
import { initSchedule } from "$lib/stores/rpool";
import type { CourseData, RawCourseData } from "$lib/types/dbTypes";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fetch the raw course data for a given term
 * @param supabase 
 * @param term 
 * @returns true if the data was fetched successfully, false if there 
 * was an error, and null if the data was already loaded
 */
const fetchRawCourseData = async (supabase: SupabaseClient, term: number): 
Promise<boolean | null> => {    
    if (rawCourseData.check(term)) return null;

    // Fetch course data from Redis
    const data = await fetch("/api/client/courses/" + term);
    if (!data.ok) return false;
    const json = await data.json();

    // Calculate adjusted rating
    json.forEach((x: any) => {
        let adj_evals = (x.num_evals + 1) * 1.5;
        x.adj_rating = x.rating !== null && x.num_evals !== null ?
        Math.round(((x.rating * (adj_evals)) + 5)/((adj_evals) + 2) * 100)/100
        : 0;
    })

    // Update raw course data store
    rawCourseData.update((x) => {
        x[term as keyof RawCourseData] = json as CourseData[];
        return x;
    });

    // Update search course data store
    searchCourseData.reset(term);
    return true;
}

/**
 * Fetch the user's schedule id and titles for a given term
 * @param supabase 
 * @param term 
 * @returns true if the schedules were fetched successfully, false if 
 * there was an error, and null if the schedules were already loaded
 */
const fetchUserSchedules = async (supabase: SupabaseClient, term: number): 
Promise<boolean | null> => {
    // Check if schedules for the given term are already loaded
    let loaded = false;
    schedules.subscribe((x) => {
        if (x[term as keyof RawCourseData].length > 0) loaded = true;
    })();
    if (loaded) return null;

    // Check if user is logged in
    const user = await supabase.auth.getUser();
    if (!user || !user.data || !user.data.user) return false;

    // Fetch schedules
    const { data, error } = await supabase
        .from("schedules")
        .select("id, title")
        .eq("user_id", user.data.user.id)
        .eq("term", term)
        .order("id", { ascending: true });

    if (error) return false;

    if (data.length === 0) {
        // Create default schedule
        const { data: data2, error } = await supabase
            .from("schedules")
            .insert([{ user_id: user.data.user.id, term, title: "My Schedule" }])
            .select()
            .single();

        if (error) return false;

        // Update schedules store
        schedules.update(x => {
            x[term as keyof RawCourseData] = [{
                id: data2.id,
                title: data2.title
            }]
            return x;
        });

        currentSchedule.set(data2.id);
        return true;
    }

    let ids = data.map(x => { 
        return {
            id: x.id,
            title: x.title
        }
    });

    // Update schedules store
    schedules.update(x => {
        x[term as keyof RawCourseData] = ids;
        return x;
    });

    currentSchedule.set(ids[0].id);

    return true;
}

/**
 * Populate the saved and pinned course pools for a given term
 * @param supabase 
 * @param scheduleIds 
 * @param term 
 */
const populatePools = async (supabase: SupabaseClient, term: number): 
Promise<void> => {
    // Get raw course data and schedule ids
    let scheduleIds: number[] = [];
    schedules.subscribe(x => {
        scheduleIds = x[term as keyof RawCourseData].map(y => y.id);
    })();

    for (const id of scheduleIds) 
        await initSchedule(supabase, id, term)
}


export { fetchRawCourseData, fetchUserSchedules, populatePools };