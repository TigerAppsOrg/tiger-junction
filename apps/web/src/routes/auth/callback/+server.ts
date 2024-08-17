import { redirect } from "@sveltejs/kit";

/**
 * Exchange the code for a session.
 */
export const GET = async ({ url, locals: { supabase } }) => {
    const code = url.searchParams.get("code");
    if (code) await supabase.auth.exchangeCodeForSession(code);
    throw redirect(303, "/recalplus");
};
