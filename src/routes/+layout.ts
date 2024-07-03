import {
    PUBLIC_SUPABASE_ANON_KEY,
    PUBLIC_SUPABASE_URL
} from "$env/static/public";
import { createSupabaseLoadClient } from "@supabase/auth-helpers-sveltekit";
import type { Config } from "@sveltejs/kit";

// This is unfortunately a Vite bug
// https://github.com/withastro/astro/issues/8660 (for workaround)
import * as _Database from "$lib/types/supabaseTypes"
type Database = _Database.Database

export const load = async ({ fetch, data, depends }) => {
    depends("supabase:auth");

    const supabase = createSupabaseLoadClient<Database>({
        supabaseUrl: PUBLIC_SUPABASE_URL,
        supabaseKey: PUBLIC_SUPABASE_ANON_KEY,
        event: { fetch },
        serverSession: data.session
    });

    const {
        data: { session }
    } = await supabase.auth.getSession();

    return { supabase, session };
};

export const config: Config = {
    runtime: "nodejs18.x"
};
