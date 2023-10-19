import type { RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async (req) => {
    // Check if user is authenticated
    const { data: { user }} = await req.locals.supabase.auth.getUser();
    if (!user) throw new Error("User not logged in");

    let term = 1234;

    // Fetch term data from Supabase
    const FIELDS = "id, listing_id, term, code, title, status, basis, dists, rating, num_evals, grading_info";

    const { data: supaCourses, error: error2 } = await req.locals.supabase
        .from("courses")
        .select(FIELDS)
        .eq("term", term)
        .order("code", { ascending: true });

    if (error2) {
        throw new Error(error2.message);
    }

    return new Response(JSON.stringify(supaCourses));
};