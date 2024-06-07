import type { Actions } from "@sveltejs/kit";
import { populateListings } from "$lib/scripts/scraper/listings.js";
import { populateEvaluations } from "$lib/scripts/scraper/evaluations";
import { populateRatings } from "$lib/scripts/scraper/ratings";
import { updateSeats } from "$lib/scripts/scraper/newRapid.js";
import { getAllCourses } from "$lib/scripts/scraper/getallcourses.js";
import { TERM_MAP } from "$lib/changeme.js";
import { redisTransfer } from "$lib/scripts/scraper/redisTransfer";

export const load = async ({ locals }) => {
    // Get #users, #schedules, #course_schedule_associations, #unresolved feedback
    const users = await locals.supabase
        .from("profiles")
        .select("*", { count: "estimated", head: true });
    if (users.error) throw new Error(users.error.message);

    const seenCount = await locals.supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("doneFeedback", true);

    if (seenCount.error) throw new Error(seenCount.error.message);

    const feedback = await locals.supabase
        .from("feedback")
        .select("id, feedback", { count: "exact", head: false })
        .eq("resolved", false);
    if (feedback.error) throw new Error(feedback.error.message);

    return {
        users: users.count,
        seenCount: seenCount.count,
        feedbackCount: feedback.count,
        feedback: feedback.data
    };
};

export const actions: Actions = {
    // ! Pushers
    pushListings: async ({ request, locals }) => {
        const formData = await request.formData();
        const term = formData.get("term") as string;
        const termInt = parseInt(term);
        if (isNaN(termInt) || !Object.keys(TERM_MAP).includes(term)) {
            console.log("Invalid term: " + term);
            return {
                message: "Invalid term"
            };
        }

        const currentTime = new Date().getTime();
        console.log("Pushing listings for term " + term);
        await populateListings(locals.supabase, termInt);
        console.log(
            "Finished pushing listings in " +
                (new Date().getTime() - currentTime) +
                "ms"
        );
        return {
            message: "Successfully pushed listings"
        };
    },
    pushCourses: async ({ request, locals }) => {
        const formData = await request.formData();
        const term = formData.get("term") as string;
        const termInt = parseInt(term);
        if (isNaN(termInt) || !Object.keys(TERM_MAP).includes(term)) {
            console.log("Invalid term: " + term);
            return {
                message: "Invalid term"
            };
        }

        const refreshGradingField = formData.get("refreshGrading") as string;
        let refreshGrading = false;
        if (refreshGradingField === "on") refreshGrading = true;

        const currentTime = new Date().getTime();
        console.log(
            "Pushing courses for term " +
                term +
                " with refreshGrading = " +
                refreshGrading
        );
        await getAllCourses(locals.supabase, termInt, refreshGrading);
        console.log(
            "Finished pushing courses in " +
                (new Date().getTime() - currentTime) +
                "ms"
        );
        return {
            message: "Successfully pushed courses"
        };
    },
    pushEvaluations: async ({ request, locals }) => {
        const formData = await request.formData();
        const term = formData.get("term") as string;
        const termInt = parseInt(term);
        if (isNaN(termInt) || !Object.keys(TERM_MAP).includes(term)) {
            console.log("Invalid term: " + term);
            return {
                message: "Invalid term"
            };
        }

        const currentTime = new Date().getTime();
        console.log("Pushing evaluations for term " + term);
        await populateEvaluations(locals.supabase, termInt);
        console.log(
            "Finished pushing evaluations in " +
                (new Date().getTime() - currentTime) +
                "ms"
        );
        return {
            message: "Successfully pushed evaluations"
        };
    },
    pushRatings: async ({ request, locals }) => {
        const formData = await request.formData();
        const term = formData.get("term") as string;
        const termInt = parseInt(term);
        if (isNaN(termInt) || !Object.keys(TERM_MAP).includes(term)) {
            console.log("Invalid term: " + term);
            return {
                message: "Invalid term"
            };
        }

        const currentTime = new Date().getTime();
        console.log("Pushing ratings for term " + term);
        await populateRatings(locals.supabase, termInt);
        console.log(
            "Finished pushing ratings in " +
                (new Date().getTime() - currentTime) +
                "ms"
        );
        return {
            message: "Successfully pushed ratings"
        };
    },
    redisTransfer: async ({ request, locals }) => {
        const formData = await request.formData();
        const term = formData.get("term") as string;
        const termInt = parseInt(term);
        if (isNaN(termInt) || !Object.keys(TERM_MAP).includes(term)) {
            console.log("Invalid term: " + term);
            return {
                message: "Invalid term"
            };
        }
        await redisTransfer(locals.supabase, termInt);
        return {
            message: "Successfully transferred data to Redis"
        };
    },
    rapidPush: async ({ request, locals }) => {
        const formData = await request.formData();
        const term = formData.get("term") as string;
        const termInt = parseInt(term);
        if (isNaN(termInt) || !Object.keys(TERM_MAP).includes(term)) {
            console.log("Invalid term: " + term);
            return {
                message: "Invalid term"
            };
        }
        updateSeats(locals.supabase, termInt);
    },
    // ! Tests
    test: async () => {
        // Import Tests
        const { testTimeToValue } = await import("$lib/scripts/convert.js");

        // Initialize successes and failures (for return message)
        let successes = 0;
        let failures = 0;

        // Add tests here
        const testList = [
            // * Time Tests
            testTimeToValue
        ];

        // Runs a test and increments successes or failures
        const runT = (test: () => boolean) => {
            test() ? successes++ : failures++;
            console.log(" ");
        };

        // Run tests
        console.log("Testing...");
        for (let test of testList) runT(test);

        const returnMessage = `Testing complete. 
                                ${successes} successes,
                                ${failures} failures.`;

        console.log(returnMessage);

        return {
            message: returnMessage
        };
    }
};
