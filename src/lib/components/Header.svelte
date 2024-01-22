<script lang="ts">
    import { goto } from "$app/navigation";
    import { calColors, calculateCssVars } from "$lib/stores/styles";
    import type { SupabaseClient } from "@supabase/supabase-js";
    import { darkTheme } from "$lib/stores/state";
    import { modalStore } from "$lib/stores/modal";
    import { isMobile } from "$lib/stores/mobile";

    export let supabase: SupabaseClient;

    const handleLogout = async () => {
        await supabase.auth.signOut();
        goto("/");
    }

    $: cssVarStyles = calculateCssVars("0", $calColors);

</script>

<nav class="w-screen h-10 mb-2 border-b-[1px]
dark:border-zinc-700 border-zinc-200" style={cssVarStyles}>
    <div class="flex justify-between items-center px-4">
        <div id="left">
            <div class="flex items-center">
                <img src="tjlogolarge.png" alt="Tiger Junction logo"
                class="w-10 h-10">
                <span class="text-xl dark:text-zinc-100">TigerJunction</span>
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

            <button class="btn-circ"
            on:click={() => modalStore.open("rcolors", { clear: true})}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
            class="btn-icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
            </svg>
            {#if !$isMobile}
                Theme    
            {/if}
            </button>

            <button class="btn-circ"
            on:click={() => modalStore.open("feedback", { clear: true})}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
            class="btn-icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
            </svg>              
            {#if !$isMobile}
                Feedback    
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