import type { SupabaseClient } from "@supabase/supabase-js";
import { getCourseIds } from "$lib/scripts/scraper/reg";
import { REGISTRAR_AUTH_BEARER, COURSE_URL } from "$lib/constants";

const SUCCESS_MESSAGE = "";
const FAILURE_MESSAGE = "";

/**
 * Pushes all courses for a given term to the database
 * @param supabase 
 * @param term 
 * @returns success or failure message
 */
export const populateCourses = async (supabase: SupabaseClient, term: string) => {
    // Fetch all course ids for the given term
    let ids = await getCourseIds(term);

    for (let i = 0; i < ids.length; i++) {
        // Fetch course data for id
        fetch(
            `${COURSE_URL}term=${term}&course_id=${ids[i]}`, {
                method: "GET",
                headers: {
                    "Authorization": REGISTRAR_AUTH_BEARER
                }
            }
        ).then(res => res.json())
            .then(data => {})

        // Upsert course data to database


        // Upsert instructor data to database


        // Set course-instructor association in database


        // Upsert section information to database


        // Set section_data entry for each section


    }
}

