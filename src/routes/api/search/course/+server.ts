import { json, error } from "@sveltejs/kit";

/**
 * @returns id, name, and category of all programs where the course 
 * with searchId is in a program's requirements
 */
export const GET = async ({ locals, url }) => {
    const session = await locals.getSession();
    if (!session) throw error(401, { message: "Unauthorized" });

    let searchId = url.searchParams.get("id");
    if (!searchId) searchId = "";

    const { data, error: supabaseError } = await locals.supabase
        .from("programs")
        .select("id, name, category, requirements!inner ( courses!inner (id))")
        .eq("requirements.courses.id", searchId)


    if (supabaseError)
        throw error(500, { message: supabaseError.message });

    let returnData = [];
    for (let i = 0; i < data.length; i++) 
        returnData.push({
            id: data[i].id,
            name: data[i].name,
            category: data[i].category
        });
    
    return json(returnData);
}