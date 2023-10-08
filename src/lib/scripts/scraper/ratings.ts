import type { DualId } from "$lib/types/dbTypes";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCourseDualIds } from "./reg";

const PARALLEL_REQUESTS = 100; // Number of parallel requests to send
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
    // ids = ids.slice(0, 50);

    // Keep track of number of different cases
    let counts = {
        id_matches: 0,
        instructor_matches: 0,
        most_recent: 0,
        nulls: 0,
        total: 0,
    };
    
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

            // Recurse
            await processNextRating(index + PARALLEL_REQUESTS);
        }

        counts.total++;

        // * Case 1: Check for evaluation entry with matching course_id
        let { data: data1, error: err1 } = await supabase
            .from("evaluations")
            .select("rating, num_evals")
            .eq("course_id", ids[index].id)

        if (err1) {
            console.log("Line PNR1")
            throw new Error(err1.message);
        }

        if (data1 === null) {
            console.log("Line PNR2")
            throw new Error("No data found");
        }

        if (data1.length > 0 && data1[0].rating !== null) {
            await supabase.from("courses")
                .update({ rating: data1[0].rating, num_evals: data1[0].num_evals })
                .eq("id", ids[index].id)
            
            counts.id_matches++;
            await nextRequest();
            return;
        }

        // * Case 2: Check for previous term with a matching instructor

        // Get all courses from previous terms with matching listing_id
        let { data: data2, error: err2 } = await supabase
            .from("courses")
            .select("id")
            .eq("listing_id", ids[index].listing_id)
            .neq("term", term)
            .order("term", { ascending: true })

        if (err2) {
            console.log("Line PNR3")
            throw new Error(err2.message);
        }

        // Get current course instructors
        let { data: data4, error: err4 } = await supabase
            .from("courses")
            .select("instructors (netid)")
            .eq("id", ids[index].id);

        if (err4) {
            console.log("Line PNR4")
            throw new Error(err4.message);
        }

        let currentInstructors: string[] = [];
        let checkInstructors: boolean = true;

        if (data4 && data4.length > 0) 
            currentInstructors = data4[0].instructors.map(x => x.netid);
        else checkInstructors = false;

        // Rating from most recent term with a rating
        let mostRecentRating: number | null = null;
        let mostRecentNumEval: number | null = null;

        if (data2 && data2.length !== 0) {

            // Get evaluations and instructors for each course
            for (let i = data2.length - 1; i >= 0; i--) {
                let { data: data3, error: err3 } = await supabase
                    .from("courses")
                    .select("evaluations (rating, num_evals), instructors (netid)")
                    .eq("id", data2[i].id);

                if (err3) {
                    console.log("Line PNR4")
                    throw new Error(err3.message);
                }

                type AppeaseTS = {
                    rating: number | null,
                    num_evals: number | null
                }

                if (data3 && data3.length > 0 && data3[0].evaluations
                && (data3[0].evaluations as unknown as AppeaseTS).rating !== null) {

                    // Check for most recent rating
                    if (!mostRecentRating) {
                        mostRecentRating = 
                        (data3[0].evaluations as unknown as AppeaseTS)
                        .rating;
                        mostRecentNumEval = 
                        (data3[0].evaluations as unknown as AppeaseTS)
                        .num_evals;
                    }

                    // Check for matching instructor
                    if (checkInstructors) {
                    for (let j = 0; j < data3[0].instructors.length; j++) {
                        if (currentInstructors
                        .includes(data3[0].instructors[j].netid)) {
                            await supabase.from("courses")
                                .update({ rating: (
                                    data3[0]
                                    .evaluations as unknown as AppeaseTS)
                                    .rating, 
                                    num_evals: (
                                        data3[0]
                                        .evaluations as unknown as AppeaseTS)
                                        .num_evals
                                })
                                .eq("id", ids[index].id)

                            counts.instructor_matches++;
                            await nextRequest();
                            return;
                        }
                    }
                    }
                }
            }
        }

        // * Case 3: Check for most recent term
        if (mostRecentRating) {
            await supabase.from("courses")
                .update({ rating: mostRecentRating, num_evals: mostRecentNumEval })
                .eq("id", ids[index].id)
            
            counts.most_recent++;
            await nextRequest();
            return;
        }

        // * Case 4: No entry (null)
        await supabase.from("courses")
            .update({ rating: null, num_evals: null })
            .eq("id", ids[index].id)

        await nextRequest();
        counts.nulls++;
        return;
    }

    // Send PARALLEL_REQUESTS requests in parallel
    let promises: Promise<void>[] = [];
    for (let i = 0; i < PARALLEL_REQUESTS; i++) {
        promises.push(processNextRating(i));
    }

    // Wait for all requests to finish
    await Promise.all(promises);

    // Return success message
    // let msg = `Finished updating ratings for ${term}. 
    //     (${ids.length - nulls} updates, ${nulls} nulls)`;
    let msg = `Finished updating ratings for ${term}. 
        (${counts.id_matches} id matches, ${counts.instructor_matches} instructor matches, ${counts.most_recent} most recent, ${counts.nulls} nulls)`;
    console.log(msg);
    return msg;
}

export { populateRatings };