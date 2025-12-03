import type { Session, User } from "@supabase/supabase-js";
import type { Database } from "$lib/types/supabaseTypes";

declare global {
    namespace App {
        interface Locals {
            supabase: ReturnType<
                typeof import("@supabase/ssr").createServerClient<Database>
            >;
            safeGetSession(): Promise<{
                session: Session | null;
                user: User | null;
            }>;
        }
        interface PageData {
            session: Session | null;
            user: User | null;
        }
        // interface Error {}
        // interface Platform {}
    }
}

export {};
