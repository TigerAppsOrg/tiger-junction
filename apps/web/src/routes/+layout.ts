import {
    PUBLIC_SUPABASE_ANON_KEY,
    PUBLIC_SUPABASE_URL
} from "$env/static/public";
import { createBrowserClient } from "@supabase/ssr";
import type { LayoutLoad } from "./$types";
import type { Database } from "$lib/types/supabaseTypes";

export const load: LayoutLoad = async ({ data, depends, fetch }) => {
    depends("supabase:auth");

    const supabase = createBrowserClient<Database>(
        PUBLIC_SUPABASE_URL,
        PUBLIC_SUPABASE_ANON_KEY,
        {
            global: {
                fetch
            }
        }
    );

    return {
        supabase,
        session: data.session,
        user: data.user
    };
};

export const config = {
    runtime: "nodejs20.x"
};
