import type { SupabaseClient } from "@supabase/supabase-js";
import { REGISTRAR_AUTH_BEARER, TERM_MAP, TERM_URL } from "$lib/constants";

const SUCCESS_MESSAGE = "Successfully populated listings for term ";
const FAILURE_MESSAGE = "Failed to populate listings for term ";

/**
 * 
 * @param supabase 
 */
export const populateAllListings = async (supabase: SupabaseClient) => {
    for (let term in TERM_MAP) {
        await populateListings(supabase, term);
    }
}

/**
 * 
 * @param supabase 
 * @param term 
 * @returns 
 */
export const populateListings = async (supabase: SupabaseClient, term: string) => {
    // Fetch course data for term
    const res = await fetch(`${TERM_URL}${term}`, {
        method: "GET",
        headers: {
            "Authorization": REGISTRAR_AUTH_BEARER
        }
    });

    // Format course data
    const data = await res.json();
    const courses = data.classes.class;
    let formatted = courses.map((x: any) => { 
        return {
            id: x.course_id,
            code: x.crosslistings,
            title: x.topic_title === null ? 
                    x.long_title : 
                    x.long_title + ": " + x.topic_title,
            aka: null,
        };
    });

    // Remove duplicates
    for (let i = 0; i < formatted.length; i++) {
        for (let j = i + 1; j < formatted.length; j++) {
            if (formatted[i].id === formatted[j].id) {
                formatted.splice(j, 1);
                j--;
            }
        }
    }

    // Limit entries 
    formatted = formatted.slice(0, 20);

    // Fetch current listings
    let { data: currentListings, error: listFetchError } = await supabase
        .from("listings")
        .select("*");
    
    if (listFetchError) {
        console.error(listFetchError);
        return "Error fetching listings";
    }

    // Insert listings
    if (!currentListings || currentListings.length === 0) {
        let { error } = await supabase
            .from("listings")
            .insert(formatted);

        if (error) return FAILURE_MESSAGE + term;
        return SUCCESS_MESSAGE + term;
    };

    for (let i = 0; i < formatted.length; i++) {
        let index: number = currentListings.findIndex(x => x.id === formatted[i].id);
        if (currentListings?.find(x => x.id === formatted[i].id) === undefined) {
            // Insert listing if it doesn't exist
            let error = await supabase
                .from("listings")
                .insert(formatted[i]);
            if (error) return FAILURE_MESSAGE + term;
        } else {
            // Handle aka field
            formatted[i].aka = currentListings[index].aka;
            if (currentListings[index].title !== formatted[i].title) {
                if (formatted[i].aka === null) 
                    formatted[i].aka = [currentListings[index].title];
                else 
                    formatted[i].aka.push(currentListings[index].title);
            }
            // Update listing
            let { error } = await supabase
                .from("listings")
                .update(formatted[i])
                .eq("id", formatted[i].id);
            if (error) return FAILURE_MESSAGE + term;
        }
    }
    return SUCCESS_MESSAGE + term;
}

