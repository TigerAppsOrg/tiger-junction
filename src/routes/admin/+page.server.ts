import { redirect, type Actions } from "@sveltejs/kit";
import { ADMIN_ID } from "$env/static/private";
import { scrapeCourses } from "$lib/populate/courses.js";
import { convertTermToId } from "$lib/convertTerm.js";

export const load = async ({ locals }) => {
    let session = await locals.getSession();
    if (session?.user.id !== ADMIN_ID) throw redirect(303, "/");
    if (!session) throw redirect(303, "/");
}

export const actions: Actions = {
    getTerm: async ({ request })=> {
        const data = await request.formData();
        const term = data.get("term");

        let termId = convertTermToId(term as string).toUpperCase();

        let res = await scrapeCourses(termId);
        return { body: { res } };
    }
};