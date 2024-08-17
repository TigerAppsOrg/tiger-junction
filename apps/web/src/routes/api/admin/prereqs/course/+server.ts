import { getToken } from "$lib/scripts/scraper/getToken";
import type { RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ url }) => {
    const term = url.searchParams.get("term");
    const course = url.searchParams.get("id");

    if (!term || !course) {
        return new Response("Invalid term or course", { status: 400 });
    }

    const apiUrl =
        "https://api.princeton.edu/registrar/course-offerings/1.0.4/course-details?term=";

    const token = await getToken();
    // Fetch all course ids and open status for the given term
    const rawCourseData = await fetch(`${apiUrl}${term}&course_id=${course}`, {
        method: "GET",
        headers: {
            Authorization: token
        }
    });

    return new Response(JSON.stringify(await rawCourseData.json()), {
        status: 200,
        headers: { "Content-Type": "application/json" }
    });
};
