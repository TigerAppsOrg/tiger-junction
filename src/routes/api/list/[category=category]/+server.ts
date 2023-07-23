import { json, error } from "@sveltejs/kit";

/**
 * @returns programs for a specific category
 */
export const GET = async ({ locals, params }) => {
    const session = await locals.getSession();
    if (!session) throw error(401, { message: "Unauthorized" });

    const { data, error: supabaseError } = await locals.supabase
        .from("programs")
        .select("name")
        .eq("category", params.category);
    
    if (supabaseError) 
        throw error(500, { message: supabaseError.message });

    let programs: string[] = data.map(x => x.name);

    return json(programs);
}