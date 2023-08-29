<script lang="ts">
import { searchResults, searchSettings } from "$lib/stores/recal";
import type { SupabaseClient } from "@supabase/supabase-js";
import ClassicSearch from "../cards/ClassicSearch.svelte";
import MinimalBase from "../cards/MinimalBase.svelte";

export let supabase: SupabaseClient;
</script>

{#if $searchResults.length > 0}
<div class="max-h-full mt-2">
    <div class="text-base font-normal dark:text-white ml-1">
        {$searchResults.length} Search 
        {$searchResults.length === 1 ? "Result" : "Results"}
    </div> <!-- * End Head -->

    <div class="flex flex-col overflow-auto border-2 rounded-xl
    max-h-[60vh]">
        <div class="overflow-y-auto">
            {#key $searchResults}
            {#each $searchResults as course}
                {#if $searchSettings.style["Original Style"]}
                    <ClassicSearch {course} />
                {:else}
                    <MinimalBase {supabase} {course} />
                {/if}
            {/each}
            {/key}
        </div>
    </div> <!-- * End Results -->
</div>
{/if}