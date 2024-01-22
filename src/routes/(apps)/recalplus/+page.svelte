<script lang="ts">
import Calendar from "$lib/components/recal/Calendar.svelte";
import Left from "$lib/components/recal/Left.svelte";
import Top from "$lib/components/recal/Top.svelte";
import { CURRENT_TERM_ID } from "$lib/constants";
import { fetchUserSchedules, populatePools } from "$lib/scripts/ReCal+/fetchDb";
import { isMobile, showCal } from "$lib/stores/mobile";
import { rawCourseData, ready, schedules, searchCourseData } from "$lib/stores/recal.js";
import { savedCourses } from "$lib/stores/rpool.js";
import { sectionData } from "$lib/stores/rsections.js";
import type { CourseData } from "$lib/types/dbTypes.js";
import { onMount } from "svelte";

export let data;

onMount(async () => {
    if ($rawCourseData[CURRENT_TERM_ID].length === 0) {
        rawCourseData.update(x => {
            let cur: CourseData[] = (data.body.courses as CourseData[]).map(y => {
                let adj_evals = (y.num_evals + 1) * 1.5;
                y.adj_rating = y.rating !== null && y.num_evals !== null ?
                Math.round(((y.rating * (adj_evals)) + 5)/((adj_evals) + 2) * 100)/100
                : 0;
                return y;
            })
            x[CURRENT_TERM_ID] = cur;
            return x;
        });

        // Sort through sections and add to sectionData
        let sections = data.body.sections;
        let termSec = $sectionData[CURRENT_TERM_ID];
        for (let i = 0; i < sections.length; i++) {
            let sec = sections[i];
            let courseId = sec.course_id;

            // Add course to sectionData 
            if (!termSec[courseId]) {
                termSec[courseId] = [];
            }
            termSec[courseId].push(sec);
        }
    }
    searchCourseData.reset(CURRENT_TERM_ID);

    // Populate user schedules
    schedules.update(x => {
        x[CURRENT_TERM_ID] = data.body.schedules;
        return x;
    });

    // Populate saved courses
    savedCourses.update(x => {
        for (const scheduleId in data.body.associations) {
            x[scheduleId] = data.body.associations[scheduleId];
        }
        return x;
    });


    console.log($schedules)
    console.log($savedCourses)


    // await fetchUserSchedules(data.supabase, CURRENT_TERM_ID);
    // await populatePools(data.supabase, CURRENT_TERM_ID);

    searchCourseData.resetAll();
    let id = $schedules[CURRENT_TERM_ID][0].id;
    let courses = [...$savedCourses[id]];
    searchCourseData.remove(CURRENT_TERM_ID, courses);

    $ready = true;
});
</script>


<svelte:head>
    <title>TigerJunction</title>
</svelte:head>


<div class="flex flex-col flex-1 w-full max-w-[1500px] mx-auto
 dark:bg-black max-h-screen overflow-clip">
    <div class="mx-2">
        <Top supabase={data.supabase} />
    </div>
    <!-- Fills bottom area does not cause page scroll -->
    <div id="main" class="flex flex-1 m-2 mt-0 max-h-[calc(100vh-80px)]">
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