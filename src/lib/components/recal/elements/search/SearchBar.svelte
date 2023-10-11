<script lang="ts">
import settingsIcon from "$lib/img/icons/settingsicon.svg";
import { modalStore } from "$lib/stores/modal";
import { searchSettings, searchResults, currentTerm, searchCourseData, currentSchedule, isResult, hoveredCourse } from "$lib/stores/recal";
import { sectionData } from "$lib/stores/rsections";
import type { SupabaseClient } from "@supabase/supabase-js";

export let supabase: SupabaseClient;

let inputBar: HTMLInputElement;

// Number of results, under which sections are added automatically
const THRESHOLD = 20;

// Update search results when params change
$: autoTrig($searchSettings, $searchCourseData, $currentTerm, $currentSchedule);
const autoTrig = (...params: any[]) => {
    triggerSearch();
}

const triggerSearch = () => {
    if (!inputBar || inputBar.value === undefined) return;
    searchResults.search(inputBar.value, $currentTerm, $searchSettings);

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
</script>

<div>
    <div class="flex gap-2">
        <input type="text" placeholder="Search" 
        class="search-input std-area" bind:this={inputBar}
        on:input={triggerSearch}>
        <button class="adv-search"
        on:click={() => modalStore.open("adv", { clear: true })}>
            <img src={settingsIcon} alt="Settings Icon" 
            class="w-6 h-6 dark:invert-[.7] invert-[.5]">
        </button>
    </div>
</div>

<style lang="postcss">
.search-input {
    @apply flex-1 p-2 h-10 w-20;
}

.adv-search {
    @apply h-10 w-10 flex justify-center items-center duration-150
    border-slate-600/30 border-2 dark:border-slate-200/60 rounded-xl;
}

.adv-search:hover {
    @apply bg-slate-100 border-slate-600/40
    dark:bg-slate-700 dark:border-slate-200/90;
}
</style>