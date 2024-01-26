<script lang="ts">
import { goto } from "$app/navigation";
import { isMobile } from "$lib/stores/mobile";
import { modalStore } from "$lib/stores/modal";
import { darkTheme } from "$lib/stores/state";
import type { SupabaseClient } from "@supabase/supabase-js";

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
                <img src="tjlogolarge.png" alt="Tiger Junction logo"
                class="w-10 h-10">
                <span class="text-xl dark:text-zinc-100">TigerJunction Admin Dashboard</span>
            </div>
        </div>

        <div id="right" class="sm:space-x-6 space-x-4 flex items-center">
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

            <button class="btn-circ" on:click={handleLogout}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
                class="btn-icon">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                {#if !$isMobile}
                Logout
                {/if}
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