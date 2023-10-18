import type { SupabaseClient } from "@supabase/supabase-js";

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