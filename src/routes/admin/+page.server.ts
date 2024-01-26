import { redirect, type Actions } from "@sveltejs/kit";
import { populateListings } from "$lib/scripts/scraper/listings.js";
import { populateEvaluations } from "$lib/scripts/scraper/evaluations";
import { populateRatings } from "$lib/scripts/scraper/ratings";
import { updateSeats } from "$lib/scripts/scraper/newRapid.js";
import { getAllCourses } from "$lib/scripts/scraper/getallcourses.js";
import { TERM_MAP } from "$lib/constants.js";

// Only allow admins to access this page
export const load = async ({ locals }) => {
    let session = await locals.getSession();
    if (!session) throw redirect(303, "/");

    let { data, error } = await locals.supabase
        .from("private_profiles")
        .select("is_admin")
        .eq("id", session.user.id);
    
    if (error) throw new Error(error.message);
    if (!data) throw new Error("No data found");
    if (!data[0].is_admin) throw redirect(303, "/");
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

        const currentTime = new Date().getTime();
        console.log("Pushing courses for term " + term);
        await getAllCourses(locals.supabase, termInt);
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

    // ! Deleters (Be aware of cascades)
    deleteAllListings: async ({ locals }) => {
        let { error } = await locals.supabase
            .from("listings")
            .delete()
            .neq("id", "0");

        if (error) throw new Error(error.message);
        return { 
            message: "Successfully deleted all listings" 
        };
    },
    deleteAllCourses: async ({ locals }) => {
        let { error } = await locals.supabase
            .from("courses")
            .delete()
            .neq("id", "0");
        
        if (error) throw new Error(error.message);
        return { 
            message: "Successfully deleted all courses" 
        };    
    },
    deleteAllInstructors: async ({ locals }) => {
        let { error } = await locals.supabase
            .from("instructors")
            .delete()
            .neq("netid", "0");
        
        if (error) throw new Error(error.message);
        return { 
            message: "Successfully deleted all instructors" 
        };
    },
    deleteAllEvaluations: async ({ locals }) => {
        let { error } = await locals.supabase
            .from("evaluations")
            .delete()
            .neq("course_id", "0");
        
        if (error) throw new Error(error.message);
        return {    
            message: "Successfully deleted all evaluations"
        };
    },
    resetAllRatings: async ({ locals }) => {
        let { error } = await locals.supabase
            .from("courses")
            .update({ rating: null })
            .neq("id", "0");
        
        if (error) throw new Error(error.message);
        return {
            message: "Successfully reset all ratings to null"
        };
    },
    deleteAllPrograms: async ({ locals }) => {
        let { error } = await locals.supabase
            .from("programs")
            .delete()
            .neq("id", "0");

        if (error) throw new Error(error.message);
        return {    
            message: "Successfully deleted all programs"
        };
    },
    deleteAllPrereqs: async ({ locals }) => {
        let { error } = await locals.supabase
            .from("prereqs")
            .delete()
            .neq("course_id", "0");
        
        if (error) throw new Error(error.message);
        return {
            message: "Successfully deleted all prereqs"
        };
    },
    deleteAllSectionData: async ({ locals }) => {
        let { error } = await locals.supabase
            .from("section_data")
            .delete()
            .neq("id", "0");
        
        if (error) throw new Error(error.message);
        return {
            message: "Successfully deleted all section data"
        };
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