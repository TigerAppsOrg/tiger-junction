import { PRIVATE_COOKIE } from "$env/static/private";
import { EVALS_TERM_MAP } from "$lib/changeme";
import { EVALUATION_URL } from "$lib/constants";
import type { DualId } from "$lib/types/dbTypes";
import type { SupabaseClient } from "@supabase/supabase-js";
import { JSDOM } from "jsdom";
import { getCourseDualIds } from "./reg";

const PARALLEL_REQUESTS = 20; // Number of parallel requests to send
const RATE = 0; // Number of milliseconds between requests

/**
 * Pushes all evaluations for a given term to the database
 * @param supabase 
 * @param term 
 * @returns success message
 */ 
const populateEvaluations = async (supabase: SupabaseClient, term: number) => {
    
    let ids: DualId[] = await getCourseDualIds(supabase, term);

    // Limit the number of evaluations fetched
    // ids = ids.slice(0, 10);

    let none = 0;
    let found = 0;

    // For each course, fetch the evaluation from the API, if it exists
    const processNextEvaluation = async (index: number) => {
        if (index >= ids.length) return; // Base case

        // Fetch the evaluation
        const res = await fetch(
            `${EVALUATION_URL}courseinfo=${ids[index].listing_id}&terminfo=${term}`, {
                method: "GET",
                headers: {
                    "Cookie": PRIVATE_COOKIE
                }
            }
        );

        // Logic for processing the next evaluation
        const nextRequest = async () => {
            // Wait RATE milliseconds before sending the next request
            await new Promise(resolve => setTimeout(resolve, RATE));
            console.log(`Finished request ${index + 1} of ${ids.length}`)

            // Recurse
            await processNextEvaluation(index + PARALLEL_REQUESTS);
        }

        // Parse the evaluation
        const dom = new JSDOM(await res.text());

        if (dom.window.document.querySelectorAll("tr").length === 0) {
            none++;
            await nextRequest();
            return;
        };

        // Check for redirection (i.e. no evaluation found)
        if (dom.window.document.querySelector("h3")?.textContent !== EVALS_TERM_MAP[term]) {
            none++;
            await nextRequest();
            return;
        }

        found++;

        const evalLabels = dom.window.document.querySelectorAll("tr")[0].querySelectorAll("th");
        const evalRatings = dom.window.document.querySelectorAll("tr")[1].querySelectorAll("td");
        const comments = dom.window.document.querySelectorAll(".comment");

        let returnDict: Record<string, any> = {};
        for (let i = 0; i < evalLabels.length; i++) {
            returnDict[evalLabels[i].textContent as string] = evalRatings[i].textContent;
            returnDict["comments"] = [...comments].map(x => x.textContent);
        }

        // Find the highest priority category that has a rating
        const findRating = () => {
            // Categories in order of priority
            const categories = [
                "Quality of Course",                // General
                "Overall Quality of the Course",    // Some grad courses
                "Overall Course Quality Rating",    // FRS
                "Quality of the Seminar",           // Seminar Edge Case
                "Quality of Lectures",              // Lecture Edge Case
                "Quality of Precepts",              // Precept Edge Case
                "Quality of Laboratories",          // Lab Edge Case
                "Recommend to Other Students",      // Edge Case
                "Quality of Readings",              // Fallback
                "Quality of Written Assignments",   // Fallback

            ];

            for (let i = 0; i < categories.length; i++) 
                if (returnDict.hasOwnProperty(categories[i]))
                    return returnDict[categories[i]];
            
            return null;
        }

        let evalCount = returnDict.hasOwnProperty("comments") ?
            returnDict["comments"].length : null;

        let { error: err1 } = await supabase.from("evaluations")
        .upsert({
            course_id: ids[index].id,
            listing_id: ids[index].listing_id,
            rating: findRating(),
            num_evals: evalCount,
            metadata: returnDict
        })

        if (err1) {
            console.log("Line PNE1")
            console.log(`Error pushing evaluation for course ${ids[index].listing_id}`);
            throw new Error(err1.message);
        }

        await nextRequest();
    }

    // Send PARALLEL_REQUESTS requests in parallel
    let promises: Promise<void>[] = [];
    for (let i = 0; i < PARALLEL_REQUESTS; i++) {
        promises.push(processNextEvaluation(i));
    }

    // Wait for all requests to finish 
    await Promise.all(promises);
    
    // Return success message
    const msg = `Found ${found} evaluations for term ${term} (${none} not found)`;
    console.log(msg);
    return msg;
}

export { populateEvaluations }