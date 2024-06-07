import { checkAdmin } from "$lib/supabase";
import type { RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async req => {
    if (!(await checkAdmin(req.locals.supabase)))
        throw new Error("User not admin");

    console.log("FEFE");

    return new Response();
};
