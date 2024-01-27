import type { SupabaseClient } from "@supabase/supabase-js";
import { TERM_URL } from "$lib/constants";
import { TERM_MAP } from "$lib/changeme";
import type { Listing } from "$lib/types/dbTypes";
import { getToken } from "./getToken";

const SUCCESS_MESSAGE = "Successfully populated listings for term ";
const FAILURE_MESSAGE = "Failed to populate listings for term ";

// TODO - Stop waiting for fetches sequentially

/**
 * @deprecated
 * @description Pushes all listings for all terms to the database.
 * @param supabase 
 * @returns success or failure message
 */
const populateAllListings = async (supabase: SupabaseClient) => {
    let resultMessage: Record<number, any> = {};
    for (let term in Object.values(TERM_MAP)) {
        let termId = parseInt(term)
        let result = await populateListings(supabase, termId);
        resultMessage[termId] = result;
    }
    return resultMessage;
}

/**
 * Pushes all listings for a given term to the database.
 * @param supabase 
 * @param term 
 * @returns success or failure message
 */
const populateListings = async (supabase: SupabaseClient, term: number) => {
    const token = await getToken();

    // Fetch course data for term
    const res = await fetch(`${TERM_URL}${term}`, {
        method: "GET",
        headers: {
            "Authorization": token
        }
    });

    // Format course data
    const data = await res.json();
    const courses = data.classes.class;
    let formatted: Listing[] = courses.map((x: any) => { 
        return {
            id: x.course_id,
            code: x.subject + x.catnum,
            title: x.topic_title === null ? 
                    x.long_title : 
                    x.long_title + ": " + x.topic_title,
            aka: null,
            ult_term: term,
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
    // formatted = formatted.slice(0, 30);

    let { data: currentListings, error: listFetchError } = await supabase
        .from("listings")
        .select("id, title, aka, ult_term, pen_term")

    if (listFetchError) {
        console.error(listFetchError);
        return "Error fetching listings";
    }

    let insertCount = 0;
    let updateCount = 0;
    let unchangedCount = 0;

    for (let i = 0; i < formatted.length; i++) {
        // Insert listing if it doesn't exist
        if (!currentListings || currentListings.length === 0) {
            let { error } = await supabase
                .from("listings")
                .insert(formatted[i]);

            if (error) return {
                message: FAILURE_MESSAGE + term 
                    + " [" + error.message + "]",
                course: formatted[i],
            };
            
            insertCount++;

        // Update or continue if it does exist
        } else {
            // let current = currentListings[0];
            let index = currentListings.findIndex(x => x.id === formatted[i].id);

            if (index === -1) {
                let { error } = await supabase
                    .from("listings")
                    .insert(formatted[i]);

                if (error) return {
                    message: FAILURE_MESSAGE + term
                        + " [" + error.message + "]",
                    course: formatted[i],
                };
                continue;
            }

            formatted[i].aka = currentListings[index].aka;

            const termCodes = Object.values(TERM_MAP);
            const newIndex = termCodes.indexOf(term);
            const ultIndex = termCodes.indexOf(currentListings[index].ult_term);
            const penIndex = termCodes.indexOf(currentListings[index].pen_term);
            let newTitle: string = formatted[i].title;

            const checkAka = () => {
                if (currentListings && newTitle !== currentListings[index].title) 
                    formatted[i].aka = addNewAka(
                            formatted[i].aka, 
                            newTitle);
            }

            // Term is the same as current ultimate term
            if (newIndex === ultIndex) {
                unchangedCount++;
                continue;

            // Term is more recent than current ultimate term
            } else if (newIndex < ultIndex) {
                checkAka();
                formatted[i].pen_term = currentListings[index].ult_term;

            // Term is older than current ultimate term
            } else {
                formatted[i].title = currentListings[index].title;

                // Penultimate term is null 
                // or is more recent than current penultimate term
                if (penIndex === -1 || newIndex < penIndex) {
                    checkAka();
                    formatted[i].ult_term = currentListings[index].ult_term;
                    formatted[i].pen_term = term;

                // Term is the same as current penultimate term
                } else if (newIndex === penIndex) {
                    unchangedCount++;
                    continue;

                // Term is older than current penultimate term
                } else {
                    checkAka();
                    formatted[i].ult_term = currentListings[index].ult_term;
                    formatted[i].pen_term = currentListings[index].pen_term;   
                }
            }

            let { error } = await supabase
                .from("listings")
                .update(formatted[i])
                .eq("id", formatted[i].id);

                if (error) return {
                    message: FAILURE_MESSAGE + term 
                        + " [" + error.message + "]",
                    course: formatted[i],
                };
            
            updateCount++;
        }
    }

    console.log("Finished populating listings for term " + term);

    return {
        message: SUCCESS_MESSAGE + term,
        inserts: insertCount,
        updates: updateCount,
        unchanged: unchangedCount,
    };
}

// Helper function to add a new aka to a listing
const addNewAka = (aka: string[] | null, title: string) => {
    if (aka === null) return [title];
    if (aka.includes(title)) return aka;

    aka.push(title);
    return aka.sort();
}

export { populateAllListings, populateListings };