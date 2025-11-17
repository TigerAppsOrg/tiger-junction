import { redirect, type RequestEvent } from "@sveltejs/kit";

/**
 * Exchange the code for a session.
 */
export const GET = async ({ url, locals: { supabase } }: RequestEvent) => {
    const code = url.searchParams.get("code");
    if (code) await supabase.auth.exchangeCodeForSession(code);
    throw redirect(303, "/recalplus");
};
