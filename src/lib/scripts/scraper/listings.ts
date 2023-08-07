import type { SupabaseClient } from "@supabase/supabase-js";
import { REGISTRAR_AUTH_BEARER, TERM_MAP, TERM_URL } from "$lib/constants";
import type { Listing } from "$lib/types/dbTypes";

const SUCCESS_MESSAGE = "Successfully populated listings for term ";
const FAILURE_MESSAGE = "Failed to populate listings for term ";

/**
 * Pushes all listings for all terms to the database.
 * @param supabase 
 * @returns success or failure message
 */
const populateAllListings = async (supabase: SupabaseClient) => {
    for (let term in TERM_MAP) {
        let result = await populateListings(supabase, term);
        if (result !== SUCCESS_MESSAGE + term) return result;
    }
    return SUCCESS_MESSAGE + "all terms";
}

/**
 * Pushes all listings for a given term to the database.
 * @param supabase 
 * @param term 
 * @returns success or failure message
 */
const populateListings = async (supabase: SupabaseClient, term: string) => {
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
    let formatted: Listing[] = courses.map((x: any) => { 
        return {
            id: x.course_id,
            code: x.crosslistings,
            title: x.topic_title === null ? 
                    x.long_title : 
                    x.long_title + ": " + x.topic_title,
            aka: null,
            ult_term: null,
            pen_term: null
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
    formatted = formatted.slice(0, 30);

    // Fetch current listings
    let { data: currentListings, error: listFetchError } = await supabase
        .from("listings")
        .select("*");
    
    if (listFetchError) {
        console.error(listFetchError);
        return "Error fetching listings";
    }

    // Directly insert listings if none exist
    if (!currentListings || currentListings.length === 0) {
        let { error } = await supabase
            .from("listings")
            .insert(formatted);

        if (error) return FAILURE_MESSAGE + term;
        return SUCCESS_MESSAGE + term 
            + "[" + formatted.length + " inserts]";
    };

    let insertCount = 0;
    let updateCount = 0;
    let unchangedCount = 0;

    for (let i = 0; i < formatted.length; i++) {
        let index = currentListings.findIndex(x => x.id === formatted[i].id);

        // Insert listing if it doesn't exist
        if (index === -1) {
            let { error } = await supabase
                .from("listings")
                .insert(formatted[i]);
            if (error) return FAILURE_MESSAGE + term 
                + " [" + error.message + "]";
            insertCount++;

        // Update or continue if it does exist
        } else {

            // Check if aka should be updated
            formatted[i].aka = currentListings[index].aka;

            const termCodes = Object.values(TERM_MAP);
            const newIndex = termCodes.indexOf(term);
            const newAka = currentListings[index].title !== formatted[i].title;

            // Term is most recent
            if (newIndex < termCodes.indexOf(currentListings[index].ult_term)) {
                if (newAka) addNewAka(formatted[i].aka, currentListings[index].title);
                formatted[i].ult_term = term;
                formatted[i].pen_term = currentListings[index].ult_term;
            
            // Term is penultimate
            } else if (newIndex < termCodes.indexOf(currentListings[index].pen_term)) {
                if (newAka) addNewAka(formatted[i].aka, currentListings[index].title);
                formatted[i].title = currentListings[index].title;
                formatted[i].pen_term = term;

            // Term is older
            } else {    
                if (newAka) addNewAka(formatted[i].aka, currentListings[index].title);
                formatted[i].title = currentListings[index].title;
            }
        }
    }
    return SUCCESS_MESSAGE + term + " [" 
        + insertCount + " inserts, " 
        + updateCount + " updates, " 
        + unchangedCount + " unchanged]";
}

// Helper function to add a new aka to a listing
const addNewAka = (aka: string[] | null, title: string) => {
    if (aka === null) return [title];
    if (aka.includes(title)) return aka;

    aka.push(title);
    return aka.sort();
}

export { populateAllListings, populateListings };