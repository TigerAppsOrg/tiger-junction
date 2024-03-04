<script lang="ts">
import { goto } from "$app/navigation";
import { darkTheme } from "$lib/stores/state";
import type { SupabaseClient } from "@supabase/supabase-js";
import logo from "$lib/img/tjlogolarge.png";
export let supabase: SupabaseClient;

// Logout the user
const handleLogout = async () => { 
    const { error } = await supabase.auth.signOut();
    if (!error) goto("/");
}

</script>
<nav class="w-screen h-10 mb-2 border-b-[1px]
dark:border-zinc-700 border-zinc-200">
    <div class="flex justify-between items-center px-4">
        <div id="left">
            <div class="flex items-center">
                <img src={logo} alt="Tiger Junction logo"
                class="w-10 h-10">
                <span class="text-xl dark:text-zinc-100">TigerJunction Admin</span>
            </div>
        </div>

        <div id="right" class="space-x-6 flex items-center">
            <button on:click={() => $darkTheme = !$darkTheme}
                class="btn-circ">
                    {#if $darkTheme}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
                    class="btn-icon">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                    </svg>                      
                    {:else}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
                    class="btn-icon">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                    </svg>                      
                    {/if}
            </button>

            <button class="btn-circ" on:click={() => goto("/recalplus")}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
                class="btn-icon">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>                  
                <span class="hidden md:block">
                    ReCal+
                </span>
            </button>

            <button class="btn-circ" on:click={() => goto("/coursegenie")}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
                class="btn-icon">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>                    
                <span class="hidden md:block">
                    CourseGenie
                </span>
            </button>

            <button class="btn-circ" on:click={() => goto("/reqtree")}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
                class="btn-icon">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                </svg>                            
                <span class="hidden md:block">
                    Panthera
                </span>
            </button>

            <button class="btn-circ" on:click={handleLogout}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
                class="btn-icon">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                <span class="hidden md:block">
                    Logout
                </span>
            </button>
        </div>
    </div>
</nav>

<style lang="postcss">
    .btn-circ {
        @apply flex items-center gap-1 dark:text-zinc-100;
    }
    
    .btn-circ:hover {
        @apply text-zinc-600 dark:text-zinc-300 duration-150;
    }
    
    
    .btn-icon {
        @apply w-5 h-5;
    }
</style>