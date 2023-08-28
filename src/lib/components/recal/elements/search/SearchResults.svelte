<script lang="ts">
import { searchResults, searchSettings } from "$lib/stores/recal";
import ClassicSearch from "../cards/ClassicSearch.svelte";
import MinimalBase from "../cards/MinimalBase.svelte";

</script>

{#if $searchResults.length > 0}
<div class="max-h-full">
    <div class="text-lg font-normal dark:text-white ml-1">
        {$searchResults.length} Search Results
    </div> <!-- * End Head -->

    <div class="flex flex-col overflow-auto border-2 rounded-xl">
        {#key $searchResults}
        {#each $searchResults as course}
            {#if $searchSettings.style["Original Style"]}
                <ClassicSearch {course} />
            {:else}
                <MinimalBase {course} />
            {/if}
        {/each}
        {/key}
    </div> <!-- * End Results -->
</div>
{/if}