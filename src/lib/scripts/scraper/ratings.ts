import type { DualId } from "$lib/types/dbTypes";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCourseDualIds } from "./reg";

const PARALLEL_REQUESTS = 10; // Number of parallel requests to send
const RATE = 0; // Number of milliseconds between requests

/**
 * Update rating value for courses from a given term
 * @param supabase 
 * @param term 
 * @returns success message
 */
const populateRatings = async (supabase: SupabaseClient, term: number) => {

    let ids: DualId[] = await getCourseDualIds(supabase, term);

    // Limit the number of evaluations fetched
    ids = ids.slice(0, 10);
    
    /*
    Priority Procedure (listing_id must always match):
    1. Evaluation entry with matching course_id 
    2. Previous term with a matching instructor 
    3. Most recent term 
    4. No entry (null)
    */
    const processNextRating = async (index: number) => {
        if (index >= ids.length) return; // Base case

        // Logic for processing the next rating
        const nextRequest = async () => {
            // Wait RATE milliseconds before sending the next request
            await new Promise(resolve => setTimeout(resolve, RATE));
            console.log(`Finished request ${index + 1} of ${ids.length}`)

            // Recurse
            await processNextRating(index + PARALLEL_REQUESTS);
        }

        // Check for evaluation entry with matching course_id
        let { data: data1, error: err1 } = await supabase.from("evaluations")
            .select("rating")
            .eq("course_id", ids[index].id)

        if (err1) {
            console.log("Line PNR1")
            console.log("Error fetching evaluations from database");
            throw new Error(err1.message);
        }

        if (data1 === null) {
            console.log("Line PNR2")
            console.log("No data found");
            throw new Error("No data found");
        }

        if (data1.length > 0 && data1[0].rating !== null) {
            await supabase.from("courses")
                .update({ rating: data1[0].rating })
                .eq("id", ids[index].id)
            
            nextRequest();
            return;
        }

        // Check for previous term with a matching instructor
        

        // Check for most recent term
    }

    // Send PARALLEL_REQUESTS requests in parallel
    let promises: Promise<void>[] = [];
    for (let i = 0; i < PARALLEL_REQUESTS; i++) {
        promises.push(processNextRating(i));
    }

    // Wait for all requests to finish
    await Promise.all(promises);

    // Return success message
    let msg = `Finished updating ratings for ${term}`;
    console.log(msg);
    return msg;
}

export { populateRatings };