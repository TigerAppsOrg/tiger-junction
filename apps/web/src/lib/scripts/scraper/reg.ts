// Shared functions for scraping the registration page

import type { DualId } from "$lib/types/dbTypes";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fetches all courses for a given term and returns their dual ids
 * @param supabase
 * @param term
 * @returns dual ids for all courses in a given term
 */
const getCourseDualIds = async (
    supabase: SupabaseClient,
    term: number
): Promise<DualId[]> => {
    // Fetch all courses for the given term from the database
    const { data, error } = await supabase
        .from("courses")
        .select("listing_id, id")
        .eq("term", term);

    if (error) {
        console.log("Error fetching courses from database");
        throw new Error(error.message);
    }

    if (data === null) {
        console.log("No courses found in database");
        throw new Error("No courses found in database");
    }

    return data.map(x => {
        return {
            listing_id: x.listing_id,
            id: x.id
        };
    });
};

export { getCourseDualIds };
