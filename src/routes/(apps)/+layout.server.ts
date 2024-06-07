import { redirect } from "@sveltejs/kit";

export const load = async ({ locals, url }) => {
    const {
        data: { user }
    } = await locals.supabase.auth.getUser();
    if (!user) throw redirect(303, "/");

    return {
        currentApp: url.pathname.split("/")[1]
    };
};
