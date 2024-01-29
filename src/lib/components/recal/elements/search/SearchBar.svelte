<script lang="ts">
import { modalStore } from "$lib/stores/modal";
import { searchSettings, searchResults, searchCourseData, currentSchedule, isResult, hoveredCourse, research, ready } from "$lib/stores/recal";
import { currentTerm } from "$lib/changeme";
import { rMeta } from "$lib/stores/rmeta";
import { sectionData } from "$lib/stores/rsections";
import { toastStore } from "$lib/stores/toast";
import type { SupabaseClient } from "@supabase/supabase-js";
import { calColors, calculateCssVars } from "$lib/stores/styles";

export let supabase: SupabaseClient;

let inputBar: HTMLInputElement;

// Number of results, under which sections are added automatically
const THRESHOLD = 20;

// Update search results when params change
$: autoTrig($searchSettings, $searchCourseData, $currentTerm,
 $currentSchedule, $research, $rMeta);
const autoTrig = (...params: any[]) => {
    triggerSearch();
}

const triggerSearch = () => {
    if (!inputBar || inputBar.value === undefined) return;
    searchResults.search(inputBar.value, $currentTerm, $searchSettings, supabase);

    // Handle isResult flag
    if ($searchResults.length > 0) isResult.set(true);
    else {
        isResult.set(false);
        hoveredCourse.set(null);   
    }

    // If results are less than threshold, add sections
    if ($searchResults.length < THRESHOLD) 
        for (let i = 0; i < $searchResults.length; i++)
            sectionData.add(supabase, $currentTerm, $searchResults[i].id);
}

$: cssVarStyles = calculateCssVars("2", $calColors);
</script>

<div class="flex flex-col gap-1" style={cssVarStyles}>
    <div class="h-4 text-xs w-full
    flex justify-between gap-1 items-center">
        <button class="togglebutton
        {$searchSettings.filters["Show All"].enabled ? "enabled" : "disabled"}"
        on:click={() => 
            $searchSettings.filters["Show All"].enabled = 
            !$searchSettings.filters["Show All"].enabled
        }>
            Show All
        </button>
        <button class="togglebutton
        {$searchSettings.filters["No Conflicts"].enabled ? "enabled" : "disabled"}"
        on:click={() => 
            $searchSettings.filters["No Conflicts"].enabled = 
            !$searchSettings.filters["No Conflicts"].enabled
        }>
            No Conflicts
        </button>
    </div>
    <div class="flex gap-2">
        <input type="text" placeholder="Search" 
        class="search-input std-area rounded-md" bind:this={inputBar}
        on:input={triggerSearch}>
        <button class="adv-search"
        on:click={() => {
            if (!$ready) toastStore.add("error", "Please wait for the data to load");
            else modalStore.open("adv", { clear: true });
        }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
            class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        </button>
    </div>
</div>

<style lang="postcss">
.search-input {
    @apply flex-1 p-2 h-10 w-20;
}

.adv-search {
    @apply h-10 w-10 flex justify-center items-center 
    dark:text-zinc-100;
}

.adv-search:hover {
    @apply text-zinc-600 dark:text-zinc-300 duration-150;
}

.togglebutton {
    @apply flex-1 h-full rounded-sm duration-100;
}

.enabled {
    background-color: var(--bg);
    color: var(--text);
}

.disabled {
    @apply bg-zinc-200 dark:bg-zinc-700;
}

.disabled:hover {
    @apply bg-zinc-300 dark:bg-zinc-600;
}
</style>