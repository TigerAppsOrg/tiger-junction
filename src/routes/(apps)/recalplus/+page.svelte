<script lang="ts">
import Calendar from "$lib/components/recal/Calendar.svelte";
import Left from "$lib/components/recal/Left.svelte";
import Top from "$lib/components/recal/Top.svelte";
import { CURRENT_TERM_ID } from "$lib/constants";
import { fetchRawCourseData, fetchUserSchedules, populatePools } from "$lib/scripts/ReCal+/fetchDb";
import { isMobile, showCal } from "$lib/stores/mobile";
import { ready, schedules, searchCourseData } from "$lib/stores/recal.js";
import { pinnedCourses, savedCourses } from "$lib/stores/rpool.js";
import { onMount } from "svelte";

export let data;

onMount(async () => {
    await fetchRawCourseData(data.supabase, CURRENT_TERM_ID);
    await fetchUserSchedules(data.supabase, CURRENT_TERM_ID);
    await populatePools(data.supabase, CURRENT_TERM_ID);

    searchCourseData.resetAll();
    let id = $schedules[CURRENT_TERM_ID][0].id;
    let courses = [...$savedCourses[id], ...$pinnedCourses[id]];
    searchCourseData.remove(CURRENT_TERM_ID, courses);

    $ready = true;
});
</script>


<svelte:head>
    <title>TigerJunction | ReCal+</title>
</svelte:head>


<div class="h-screen flex flex-col flex-1 max-w-[1400px] mx-auto
bg-white dark:bg-black max-h-screen overflow-clip">
    <div class="mx-2 overflow-hidden">
        <Top supabase={data.supabase} />
    </div>
    <!-- Fills bottom area does not cause page scroll -->
    <div id="main" class="flex flex-1 m-2 max-h-[calc(100vh-80px)]">
        {#if $isMobile}
            {#if !$showCal}
                <div class="flex-1 min-w-[200px]">
                    <Left supabase={data.supabase} />
                </div>
            {:else}
                <div class="flex-1">
                    <Calendar supabase={data.supabase} />
                </div>
            {/if}
        {:else}
            <div class="w-1/5 min-w-[200px]">
                <Left supabase={data.supabase} />
            </div>
            <div class="flex-1 min-w-[400px] ml-2">
                <Calendar supabase={data.supabase} />
            </div>
        {/if}
    </div>
</div>

<style lang="postcss">
/* On mobile, one toggles the views back and forth */
#main {
    
}
</style>