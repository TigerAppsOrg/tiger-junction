<script lang="ts">
    import { handleLogin } from "$lib/scripts/supabase";
    import type { SupabaseClient } from "@supabase/supabase-js";
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";

    let { supabase }: { supabase: SupabaseClient } = $props();
</script>

<div
    class="max-w-7xl mx-4 px-4 py-2 w-11/12 bg-white rounded-2xl
    fixed shadow-md z-50">
    <nav class="flex justify-between sm:grid sm:grid-cols-3">
        <a
            href="/"
            onclick={(e) => {
                e.preventDefault();
                if ($page.url.pathname === "/") {
                    document.getElementById("main")?.scrollIntoView({
                        behavior: "smooth"
                    });
                } else {
                    goto("/");
                }
            }}
            class="flex items-center flex-shrink-0 gap-1 text-black mr-6">
            <img
                src="/tjlogonew.png"
                alt="Tiger Junction logo"
                class="w-10 h-10" />
            <span class="font-semibold text-xl tracking-tight"
                >TigerJunction</span>
        </a>
        <div class="items-center justify-center lg:gap-8 gap-4 hidden sm:flex">
            {#if $page.url.pathname === "/"}
                <a
                    href="/#about"
                    onclick={(e) => {
                        e.preventDefault();
                        document.getElementById("about")?.scrollIntoView({
                            behavior: "smooth"
                        });
                    }}
                    class="nav-link">
                    About
                </a>
                <a
                    href="/#features"
                    onclick={(e) => {
                        e.preventDefault();
                        document.getElementById("features")?.scrollIntoView({
                            behavior: "smooth"
                        });
                    }}
                    class="nav-link">
                    Features
                </a>
            {/if}
        </div>
        <div class="flex items-center justify-end">
            <button
                onclick={() => handleLogin(supabase)}
                class="bg-indigo-600 hover:bg-indigo-500 text-white
                    text-center px-4 py-2 rounded-lg font-bold
                     duration-100">
                Log In
            </button>
        </div>
    </nav>
</div>

<style lang="postcss">
    nav {
        grid-template-columns: 1fr 1fr 1fr;
    }

    .nav-link {
        position: relative;
        text-decoration: none;
    }

    .nav-link::after {
        content: "";
        position: absolute;
        width: 100%;
        height: 2px;
        bottom: 0;
        left: 0;
        transform: scaleX(0);
        transform-origin: bottom right;
        transition: transform 0.3s ease-out;
        @apply bg-indigo-600;
    }

    .nav-link:hover::after {
        transform: scaleX(1);
        transform-origin: bottom left;
    }
</style>
