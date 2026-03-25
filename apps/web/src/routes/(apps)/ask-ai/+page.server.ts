import { redirect } from "@sveltejs/kit";

export const load = async ({ locals: { supabase } }) => {
    const {
        data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
        throw redirect(303, "/");
    }

    return { userId: user.id };
};
