import { redirect } from "@sveltejs/kit";

export const load = async ({ locals }) => {
    // Only allow admins to access admin pages
    let session = await locals.getSession();
    if (!session) throw redirect(303, "/");

    let { data, error } = await locals.supabase
        .from("private_profiles")
        .select("is_admin")
        .eq("id", session.user.id);
    
    if (error) throw new Error(error.message);
    if (!data) throw new Error("No data found");
    if (!data[0].is_admin) throw redirect(303, "/");
};