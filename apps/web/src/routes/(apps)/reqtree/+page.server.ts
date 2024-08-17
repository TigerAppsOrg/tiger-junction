import { redirect } from "@sveltejs/kit";

export const load = async ({ locals: { supabase } }) => {
    // Redirect to home page if user is not logged in
    const {
        data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
        throw redirect(303, "/");
    }
};
