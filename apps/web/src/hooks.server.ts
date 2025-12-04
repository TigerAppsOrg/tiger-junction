import {
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY
} from "$env/static/public";
import type { Database } from "$lib/types/supabaseTypes";
import { createServerClient } from "@supabase/ssr";
import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
    event.locals.supabase = createServerClient<Database>(
        PUBLIC_SUPABASE_URL,
        PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll: () => event.cookies.getAll(),
                setAll: cookiesToSet => {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        event.cookies.set(name, value, {
                            ...options,
                            path: "/"
                        });
                    });
                }
            }
        }
    );

    event.locals.safeGetSession = async () => {
        const {
            data: { session }
        } = await event.locals.supabase.auth.getSession();

        if (!session) {
            return { session: null, user: null };
        }

        const {
            data: { user },
            error
        } = await event.locals.supabase.auth.getUser();

        if (error) {
            return { session: null, user: null };
        }

        return { session, user };
    };

    return resolve(event, {
        filterSerializedResponseHeaders(name) {
            return (
                name === "content-range" || name === "x-supabase-api-version"
            );
        }
    });
};
