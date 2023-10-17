import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from "$env/static/public";
import { SupabaseClient, createClient, type Session } from "@supabase/supabase-js";

// export const supabase: SupabaseClient = createClient(
//     PUBLIC_SUPABASE_URL,
//     PUBLIC_SUPABASE_ANON_KEY
// )

export const createSupabaseClient = (supabase: SupabaseClient): SupabaseClient => {
    return createClient(
        PUBLIC_SUPABASE_URL,
        PUBLIC_SUPABASE_ANON_KEY,
        // {global: { headers: { Authorization: session.headers.get('Authorization')! }}}
    );
}

/**
 * Checks if the user is an admin
 * @param id 
 * @returns 
 */
export const checkAdmin = async (supabase: SupabaseClient): Promise<boolean> => {
    const { data: { user }} = await supabase.auth.getUser();
    if (!user) {
        throw new Error("User not found");
    }

    const { data, error } = await supabase.from("private_profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
    
    return !error && data && data.is_admin;
}