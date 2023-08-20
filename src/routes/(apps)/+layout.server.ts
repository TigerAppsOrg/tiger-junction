import { redirect } from '@sveltejs/kit';

export const load = async ({ locals, url }) => {
    let session = await locals.getSession();
    if (!session) throw redirect(303, "/");

    return {
        currentApp: url.pathname.split("/")[1]
    }
}