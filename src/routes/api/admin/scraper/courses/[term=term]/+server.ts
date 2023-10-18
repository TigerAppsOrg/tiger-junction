import { checkAdmin } from "$lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async (req) => {
    let supabase: SupabaseClient = req.locals.supabase;
    if (!await checkAdmin(supabase)) throw new Error("User not admin");

    let term = req.params.term;

    const { data, error } = await supabase.functions.invoke("courses", {
        body: { term, round: 0 },
    });

    if (error || !data) {
        console.log("Line 1");
        console.log(error);
        return new Response(JSON.stringify(error));
    }

    return new Response(JSON.stringify("Began scraping courses for term " + term + " (begin at round 0)"));
};