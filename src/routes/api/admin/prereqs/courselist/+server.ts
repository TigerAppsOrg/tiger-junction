import { TERM_MAP } from "$lib/changeme";
import { TERM_URL } from "$lib/constants";
import { getToken } from "$lib/scripts/scraper/getToken";
import type { RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async (req) => {
    let term = req.url.searchParams.get("term");
    if (!term || !TERM_MAP.hasOwnProperty(parseInt(term))) {
        return new Response("Invalid term", { status: 400 });
    }

    const token = await getToken();
    // Fetch all course ids and open status for the given term
    const rawCourselist = await fetch(`${TERM_URL}${term}`, {
        method: "GET",
        headers: {
            "Authorization": token
        }
    });

   return new Response(
        JSON.stringify(await rawCourselist.json()),
        { status: 200, headers: { "Content-Type": "application/json" } }
   );
};