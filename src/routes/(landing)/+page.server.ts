import { redirect } from "@sveltejs/kit";

export const load = async ({ locals }) => {
    const {
        data: { user }
    } = await locals.supabase.auth.getUser();
    if (user) {
        throw redirect(303, "/recalplus");
    }
};
