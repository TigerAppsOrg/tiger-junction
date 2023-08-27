import { rawCourseData } from "$lib/stores/recal";
import type { CourseData, RawCourseData } from "$lib/types/dbTypes";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fetch the raw course data for a given term
 * @param supabase 
 * @param term 
 * @returns 
 */
const fetchRawCourseData = async (supabase: SupabaseClient, term: number): Promise<boolean | null> => {
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

    return true;
}

const fetchUserSchedules = async (supabase: SupabaseClient, term: number): Promise<boolean | null> => {

}

export { fetchRawCourseData };