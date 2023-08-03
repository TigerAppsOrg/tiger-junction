import type { SupabaseClient } from "@supabase/supabase-js";
import { getCourseIds } from "$lib/scripts/scraper/reg";


export const populateCourses = async (supabase: SupabaseClient, term: string) => {
    let ids = await getCourseIds(term);

    for (let i = 0; i < ids.length; i++) {
        
    }
}

