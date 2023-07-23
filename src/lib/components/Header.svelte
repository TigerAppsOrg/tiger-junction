<script lang="ts">
    import { goto } from "$app/navigation";
    import type { SupabaseClient } from "@supabase/supabase-js";

    export let supabase: SupabaseClient;

    const handleLogout = async () => {
        await supabase.auth.signOut();
        goto("/");
    }
</script>

<nav class="bg-secondary fixed top-0 w-screen">
    <div class="flex justify-between items-center px-4">
        <div id="left">
            <a href="/home" class="flex items-center">
                <img src="tjlogolarge.png" alt="Tiger Junction logo"
                class="w-16 h-16">
                <span>TigerJunction</span>
            </a>
        </div>
        <div id="right" class="space-x-6">
            <a href="/majors">
                Majors
            </a>
            <a href="/certificates">
                Certificates
            </a>
            <button class="btn btn-primary"
            on:click={handleLogout}>
                Logout
            </button>
        </div>
    </div>
</nav>