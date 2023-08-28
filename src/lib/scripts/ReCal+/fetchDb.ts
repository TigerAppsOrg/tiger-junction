import { currentSchedule, rawCourseData, schedules, searchCourseData } from "$lib/stores/recal";
import { pinnedCourses, savedCourses } from "$lib/stores/rpool";
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
    const FIELDS = "id, listing_id, term, code, title, status, basis, dists, rating, grading_info";
    
    if (rawCourseData.check(term)) return null;

    const { data, error } = await supabase
        .from("courses")
        .select(FIELDS)
        .eq("term", term)
        .order("code", { ascending: true });

    if (error) return false

    rawCourseData.update((x) => {
        x[term as keyof RawCourseData] = data as CourseData[];
        return x;
    });

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
const populatePools = (supabase: SupabaseClient, term: number): void => {
    // Get raw course data and schedule ids
    const rawCourses = rawCourseData.get(term);
    let scheduleIds: number[] = [];
    schedules.subscribe(x => {
        scheduleIds = x[term as keyof RawCourseData].map(y => y.id);
    })();

    scheduleIds.forEach(id => {
        // Check if pools are already populated
        let loaded = false;
        savedCourses.subscribe(x => {
            if (x.hasOwnProperty(id) && x[id].length > 0) loaded = true;
        })();
        pinnedCourses.subscribe(x => {
            if (x.hasOwnProperty(id) && x[id].length > 0) loaded = true;
        })();
        if (loaded) return;
        
        // Fetch course-schedule-associations
        supabase.from("course_schedule_associations")
            .select("course_id, is_pinned")
            .eq("schedule_id", id)
        .then(res => {
            if (res.error) {
                console.log(res.error);
                return;
            }

            // Populate pools
            res.data.forEach(x => {
                let pool = x.is_pinned ? pinnedCourses : savedCourses;
                let cur = rawCourses
                    .find(y => y.id === x.course_id) as CourseData;
                pool.add(supabase, id, cur);
            });
        });
    });
}

export { fetchRawCourseData, fetchUserSchedules, populatePools };