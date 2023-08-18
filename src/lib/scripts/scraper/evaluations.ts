import { PRIVATE_COOKIE } from "$env/static/private";
import { EVALS_TERM_MAP, EVALUATION_URL } from "$lib/constants";
import type { SupabaseClient } from "@supabase/supabase-js";
import { JSDOM } from "jsdom";

const PARALLEL_REQUESTS = 10; // Number of parallel requests to send
const RATE = 0; // Number of milliseconds between requests

/**
 * Pushes all evaluations for a given term to the database
 * @param supabase 
 * @param term 
 * @returns success message
 */ 
const populateEvaluations = async (supabase: SupabaseClient, term: number) => {
    // Fetch all courses for the given term from the database
    let { data, error } = await supabase.from("courses")
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

    type DualId = {
        listing_id: string,
        id: number
    }

    let ids: DualId[] = data.map(x => { return {
        listing_id: x.listing_id,
        id: x.id
    }})

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
                "Quality of Course",
                "Overall Quality of the Course",
            ];

            for (let i = 0; i < categories.length; i++) 
                if (returnDict.hasOwnProperty(categories[i]))
                    return returnDict[categories[i]];
            
            return -1;
        }

        let { error: err1 } = await supabase.from("evaluations")
        .upsert({
            course_id: ids[index].id,
            listing_id: ids[index].listing_id,
            rating: findRating(),
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