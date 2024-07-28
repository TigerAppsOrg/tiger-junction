<script lang="ts">
    import { handleLogin } from "$lib/scripts/supabase";
    import type { SupabaseClient } from "@supabase/supabase-js";

    export let supabase: SupabaseClient;
</script>

<div class="max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
    <nav class="flex items-center justify-between flex-wrap">
        <a href="/" class="flex items-center flex-shrink-0 text-black mr-6">
            <img
                src="/tjlogonew.png"
                alt="Tiger Junction logo"
                class="w-12 h-12" />
            <span class="font-semibold text-xl tracking-tight"
                >TigerJunction</span>
        </a>
        <div class="flex-grow flex items-center w-auto">
            <div class="text-sm flex-grow">
                <!-- <a href="/about" class="link">
                About
            </a>
            <a href="/developer" class="link">
                API
            </a>
            <a href="/blog" class="link">
                Blog
            </a>
            <a href="/contact" class="link">
                Contact
            </a> -->
            </div>
            <div>
                <button
                    on:click={() => handleLogin(supabase)}
                    class="inline-block text-sm px-4 py-2 leading-none border rounded
             text-black border-black hover:text-zinc-600
            hover:border-zinc-600">
                    Login
                </button>
            </div>
        </div>
    </nav>
</div>

<style lang="postcss">
    /* .link {
        @apply inline-block mt-0 text-black hover:text-zinc-600 mr-4;
    } */
</style>
