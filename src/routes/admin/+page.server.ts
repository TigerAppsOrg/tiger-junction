import { redirect, type Actions } from "@sveltejs/kit";
import { populateListings } from "$lib/scripts/scraper/listings.js";
import { populateEvaluations } from "$lib/scripts/scraper/evaluations";
import { populateRatings } from "$lib/scripts/scraper/ratings";
import { updateSeats } from "$lib/scripts/scraper/newRapid.js";
import { getAllCourses } from "$lib/scripts/scraper/getallcourses.js";
import { TERM_MAP } from "$lib/constants.js";

export const load = async ({ locals }) => {
    // Only allow admins to access this page
    let session = await locals.getSession();
    if (!session) throw redirect(303, "/");

    let { data, error } = await locals.supabase
        .from("private_profiles")
        .select("is_admin")
        .eq("id", session.user.id);
    
    if (error) throw new Error(error.message);
    if (!data) throw new Error("No data found");
    if (!data[0].is_admin) throw redirect(303, "/");

    // Get #users, #schedules, #course_schedule_associations, #unresolved feedback
    const users = await locals.supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
    if (users.error) throw new Error(users.error.message);

    const schedules = await locals.supabase
        .from("schedules")
        .select("*", { count: "exact", head: true });
    if (schedules.error) throw new Error(schedules.error.message);

    const course_schedule_associations = await locals.supabase
        .from("course_schedule_associations")
        .select("*", { count: "exact", head: true });
    if (course_schedule_associations.error) throw new Error(course_schedule_associations.error.message);

    const feedback = await locals.supabase
        .from("feedback")
        .select("id, feedback", { count: "exact", head: false })
        .eq("resolved", false);
    if (feedback.error) throw new Error(feedback.error.message);

    return {
        users: users.count,
        schedules: schedules.count,
        course_schedule_associations: course_schedule_associations.count,
        feedbackCount: feedback.count,
        feedback: feedback.data
    }
}

export const actions: Actions = {
    // ! Pushers
    pushListings: async ({ request, locals }) => {
        const formData = await request.formData();
        const term = formData.get("term") as string;
        const termInt = parseInt(term);
        if (isNaN(termInt) || !Object.values(TERM_MAP).includes(termInt)) {
            console.log("Invalid term: " + term);
            return {
                message: "Invalid term"
            };
        }

        const currentTime = new Date().getTime();
        console.log("Pushing listings for term " + term);
        await populateListings(locals.supabase, termInt);
        console.log("Finished pushing listings in " + (new Date().getTime() - currentTime) + "ms");
        return {
            message: "Successfully pushed listings"
        };
    },
    pushCourses: async ({ request, locals }) => {
        const formData = await request.formData();
        const term = formData.get("term") as string;
        const termInt = parseInt(term);
        if (isNaN(termInt) || !Object.values(TERM_MAP).includes(termInt)) {
            console.log("Invalid term: " + term);
            return {
                message: "Invalid term"
            };
        }

        const refreshGradingField = formData.get("refreshGrading") as string;
        let refreshGrading = false;
        if (refreshGradingField === "on") refreshGrading = true;

        const currentTime = new Date().getTime();
        console.log("Pushing courses for term " + term + " with refreshGrading = " + refreshGrading);
        await getAllCourses(locals.supabase, termInt, refreshGrading);
        console.log("Finished pushing courses in " + (new Date().getTime() - currentTime) + "ms");
        return {
            message: "Successfully pushed courses"
        };
    },
    pushEvaluations: async ({ request, locals }) => {
        const formData = await request.formData();
        const term = formData.get("term") as string;
        const termInt = parseInt(term);
        if (isNaN(termInt) || !Object.values(TERM_MAP).includes(termInt)) {
            console.log("Invalid term: " + term);
            return {
                message: "Invalid term"
            };
        }

        const currentTime = new Date().getTime();
        console.log("Pushing evaluations for term " + term);
        await populateEvaluations(locals.supabase, termInt);
        console.log("Finished pushing evaluations in " + (new Date().getTime() - currentTime) + "ms");
        return {
            message: "Successfully pushed evaluations"
        };
    },
    pushRatings: async ({ request, locals }) => {
        const formData = await request.formData();
        const term = formData.get("term") as string;
        const termInt = parseInt(term);
        if (isNaN(termInt) || !Object.values(TERM_MAP).includes(termInt)) {
            console.log("Invalid term: " + term);
            return {
                message: "Invalid term"
            };
        }

        const currentTime = new Date().getTime();
        console.log("Pushing ratings for term " + term);
        await populateRatings(locals.supabase, termInt);
        console.log("Finished pushing ratings in " + (new Date().getTime() - currentTime) + "ms");
        return {
            message: "Successfully pushed ratings"
        };
    },
    rapidPush: async ({ request, locals }) => {
        const formData = await request.formData();
        const term = formData.get("term") as string;
        const termInt = parseInt(term);
        if (isNaN(termInt) || !Object.values(TERM_MAP).includes(termInt)) {
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
            console.log(" ")
        }
        
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