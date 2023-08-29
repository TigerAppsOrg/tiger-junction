<script lang="ts">
import { currentSchedule, searchSettings } from "$lib/stores/recal";
import type { SupabaseClient } from "@supabase/supabase-js";
import ClassicSearch from "../cards/ClassicSearch.svelte";
import MinimalBase from "../cards/MinimalBase.svelte";
import { savedCourses } from "$lib/stores/rpool";

export let supabase: SupabaseClient;

$: saved = $savedCourses[$currentSchedule];
</script>


{#if saved && saved.length > 0}
<div class="max-h-full">
    <div class="text-base font-normal dark:text-white ml-1">
        {saved.length} Saved Courses
    </div> <!-- * End Head -->

    <div class="flex flex-col overflow-hidden border-2 rounded-xl 
    max-h-[30vh]">
        <div class="overflow-y-scroll">
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
</div>
{/if}
