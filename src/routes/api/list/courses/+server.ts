import { convertTermToId } from "$lib/scripts/convertTerm.js";
import { json, error } from "@sveltejs/kit";

/**
 * @returns all courses or courses for a specific term
 */
export const GET = async ({ locals, url }) => {
    const session = await locals.getSession();
    if (!session) throw error(401, { message: "Unauthorized" });

    const termParam = url.searchParams.get("term");

    if (termParam === "all") 
        return json(await getAllCourses(locals));

    return json(await getCourses(locals, convertTermToId(termParam)));
}

// Helper method to get all courses
const getAllCourses = async (locals: App.Locals) => {
    const { data, error: supabaseError } = await locals.supabase
        .from("courses")
        .select("id, name, registrar_id");

    if (supabaseError) 
        throw error(500, { message: supabaseError.message });

    return data;
}

// Helper method to get courses for a specific term
const getCourses = async (locals: App.Locals, term: string) => {
    const { data, error: supabaseError } = await locals.supabase
        .from("courses")
        .select("id, name, registrar_id")
        .eq("term", term);

    if (supabaseError) 
        throw error(500, { message: supabaseError.message });

    return data;
}