import { redirect } from '@sveltejs/kit';

export const load = async ({ locals: { getSession } }) => {
    const session = await getSession();
    const user = session && session.user;
    if (user) {
        throw redirect(303, "/recalplus");
    }
};