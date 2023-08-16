import { redirect, type Actions } from "@sveltejs/kit";
import { getCourseData } from "$lib/scripts/scraper/reg.js";
import { populateListings } from "$lib/scripts/scraper/listings.js";
import { populateCourses } from "$lib/scripts/scraper/courses.js";

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
    // ! Getters
    /**
     * @returns course list for a specific term from the registrar API
     */
    getTerm: async ({ request }) => {
        const data = await request.formData();
        const termId = data.get("term") as string;

        let res = await getCourseData("013693" ,termId);
        return { body: { res } };
    },

    // ! Pushers
    pushListings: async ({ request, locals }) => {
        const termId = await parseTermId(request);
        let message = await populateListings(locals.supabase, termId);
        return message;
    },
    pushCourses: async ({ request, locals }) => {
        const termId = await parseTermId(request);
        let message = await populateCourses(locals.supabase, termId);
        return message;
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
            message: "Successfully deleted all listings" 
        };    
    },
    deleteAllInstructors: async ({ locals }) => {
        let { error } = await locals.supabase
            .from("instructors")
            .delete()
            .neq("netid", "0");
        
        if (error) throw new Error(error.message);
        return { 
            message: "Successfully deleted all listings" 
        };
    },
};

// ! Helpers

// Parses the term id from the request
const parseTermId = async (request: Request) => {
    const formData = await request.formData();
    const term = formData.get("term") as string;
    return parseInt(term);
}