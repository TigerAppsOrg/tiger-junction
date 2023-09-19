<script lang="ts">
import { currentSchedule, isResult, ready, recal, retop, searchSettings } from "$lib/stores/recal";
import type { SupabaseClient } from "@supabase/supabase-js";
import ClassicSearch from "../cards/ClassicSearch.svelte";
import MinimalBase from "../cards/MinimalBase.svelte";
import { pinnedCourses, savedCourses } from "$lib/stores/rpool";

export let supabase: SupabaseClient;

$: saved = $savedCourses[$currentSchedule] ? 
    $savedCourses[$currentSchedule].sort((a, b) => a.code.localeCompare(b.code))
    : [];
$: pinned = $pinnedCourses[$currentSchedule] ?
    $pinnedCourses[$currentSchedule].sort((a, b) => a.code.localeCompare(b.code))
    : [];
</script>


{#key saved && $recal}
{#if saved && $ready}
<div class="max-h-full mt-2">
    <div class="text-base font-normal dark:text-white ml-1">
        <span>
            {saved.length} Saved 
            {saved.length === 1 ? "Course" : "Courses"}
            {#if pinned.length > 0}
            ({pinned.length} Pin{pinned.length === 1 ? "" : "s"})
            {/if}   
        </span>
    </div> <!-- * End Head -->

    {#if saved.length > 0}
    <div class="flex flex-col overflow-hidden rounded-xl 
    {$isResult ? "max-h-[10vh]" : "max-h-[75vh]"}">
        <div class="overflow-y-auto">
            {#key saved}
            {#each saved as course}
                {#if $searchSettings.style["Original Style"]}
                    <ClassicSearch {course} />
                {:else}
                    <MinimalBase {supabase} {course} category="saved" />
                {/if}
            {/each}
            {/key}
        </div>
    </div> <!-- * End Results -->
    {/if}
</div>
{/if}
{/key}