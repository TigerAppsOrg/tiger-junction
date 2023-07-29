import { redirect, type Actions } from "@sveltejs/kit";
import { ADMIN_ID } from "$env/static/private";
import { scrapeCourses } from "$lib/scripts/courses";
import { convertTermToId } from "$lib/scripts/convert";
import { getAllCourseEvaluations, getCourseEvaluation, getCourseIds } from "$lib/scripts/scraper.js";

// Only allow admins to access this page
export const load = async ({ locals }) => {
    let session = await locals.getSession();
    if (session?.user.id !== ADMIN_ID) throw redirect(303, "/");
    if (!session) throw redirect(303, "/");
}

export const actions: Actions = {
    /**
     * @returns course list for a specific term from the registrar API
     */
    getTerm: async ({ request }) => {
        const data = await request.formData();
        const term = data.get("term");

        let termId = convertTermToId(term as string).toUpperCase();

        let res = await scrapeCourses(termId);
        return { body: { res } };
    },
    /**
     * 
     */
    postTerm: async ({ request, locals }) => {
        const data = await request.formData();
        const term = data.get("term");

        let termId = convertTermToId(term as string).toUpperCase();

        let res = await scrapeCourses(termId);

        let { data: cur, error: currentError} = await locals.supabase
            .from("courses")
            .select("registrar_id")
            .eq("term", termId);

        if (currentError) throw new Error(currentError.message);
        if (!cur) cur = [];

        let currentCourses: string[] = cur.map(x => x.registrar_id);

        // Upload all from term if term doesn't exist
        if (currentCourses.length === 0) {
            let { error: uploadError } = await locals.supabase
                .from("courses")
                .insert(res);

            if (uploadError)
                throw new Error(uploadError.message);
        } else {
            // Update all from term if term exists
            for (let i = 0; i < res.length; i++) {
                if (currentCourses.find(x => x === res[i].registrar_id)) continue;
                else {
                    let { error: uploadError } = await locals.supabase
                        .from("courses")
                        .insert(res[i]);

                    if (uploadError)
                        throw new Error(uploadError.message);
                }
            }
            for (let i = 0; i < currentCourses.length; i++) {
                if (res.find(x => x.registrar_id === currentCourses[i])) continue;
                else {
                    let { error: deleteError } = await locals.supabase
                        .from("courses")
                        .delete()
                        .eq("registrar_id", currentCourses[i]);

                    if (deleteError)
                        throw new Error(deleteError.message);
                }
            }
        }
        return { body: { message: "Success!"} };
    },
    getEvaluations: async ({ request }) => {
        const formData = await request.formData();
        const termId = formData.get("term") as string;

        const courseIds = await getCourseIds(termId);
        const evaluations = await getAllCourseEvaluations(courseIds, termId);

        return { body: { evaluations, courseIds } };
    },
    pushEvaluations: async ({ request, locals }) => {

    }
};
