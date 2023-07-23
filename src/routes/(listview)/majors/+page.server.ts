import { error, redirect } from "@sveltejs/kit";

export const load = async ({ locals }) => {
    let session = await locals.getSession();
    if (!session) throw redirect(303, "/");

    const { data, error: supabaseError } = await locals.supabase
    .from("programs")
    .select("name")
    .eq("category", "major");

    if (supabaseError) 
        throw error(500, { message: supabaseError.message });

    let programs: string[] = data.map(x => x.name);

    return {
        majorList: programs
    };
};