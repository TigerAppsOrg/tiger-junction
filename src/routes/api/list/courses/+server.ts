import { json, error } from "@sveltejs/kit";

export const GET = async ({ locals, url }) => {
    const session = await locals.getSession();
    if (!session) throw error(401, { message: "Unauthorized" });

    if (url.searchParams.get("all") === "true") 
        return json(await getAllCourses(locals));
    else 
        return json(await getCurrentCourses(locals));
}

const getAllCourses = async (locals: App.Locals) => {
    const { data, error: supabaseError } = await locals.supabase
        .from("courses")
        .select("id, name");

    if (supabaseError) 
        throw error(500, { message: supabaseError.message });

    return data;
}

const getCurrentCourses = async (locals: App.Locals) => {
    const { data, error: supabaseError } = await locals.supabase
        .from("courses")
        .select("id, name")
        .eq("is_current", true);

    if (supabaseError) 
        throw error(500, { message: supabaseError.message });

    return data;
}