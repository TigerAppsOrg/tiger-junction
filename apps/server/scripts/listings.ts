import type { SupabaseClient } from "@supabase/supabase-js";
import { getToken } from "./shared";

const populateListings = async (supabase: SupabaseClient, term: number) => {
    const token = await getToken();
};
