<script lang="ts">
import { currentSchedule, searchSettings } from "$lib/stores/recal";
import type { SupabaseClient } from "@supabase/supabase-js";
import ClassicSearch from "../cards/ClassicSearch.svelte";
import MinimalBase from "../cards/MinimalBase.svelte";
import { pinnedCourses } from "$lib/stores/rpool";

export let supabase: SupabaseClient;

$: pinned = $pinnedCourses[$currentSchedule];
</script>


{#if pinned && pinned.length > 0}
<div class="max-h-full">
    <div class="text-base font-normal dark:text-white ml-1">
        {pinned.length} Pinned Courses
    </div> <!-- * End Head -->

    <div class="flex flex-col overflow-hidden border-2 rounded-xl 
    max-h-[30vh]">
        <div class="overflow-y-scroll">
            {#key pinned}
            {#each pinned as course}
                {#if $searchSettings.style["Original Style"]}
                    <ClassicSearch {course} />
                {:else}
                    <MinimalBase {supabase} {course} category="pinned" />
                {/if}
            {/each}
            {/key}
        </div>
    </div> <!-- * End Results -->
</div>
{/if}
