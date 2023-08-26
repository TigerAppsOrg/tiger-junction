<script lang="ts">
import { searchResults, searchSettings } from "$lib/stores/recal";
import ClassicSearch from "../cards/classic/ClassicSearch.svelte";
import MinimalSearch from "../cards/minimal/MinimalSearch.svelte";

$: length = $searchResults.length;
</script>

{#if length > 0}
<div class="max-h-full">
    <div class="text-lg font-normal">
        {length} Search Results
    </div> <!-- * End Head -->

    <div class="flex flex-col overflow-auto border-2 rounded-xl">
        {#each $searchResults as course}
            {#if $searchSettings.style["Original Style"]}
                <ClassicSearch {course} />
            {:else}
                <MinimalSearch {course} />
            {/if}
        {/each}
    </div> <!-- * End Results -->
</div>
{/if}