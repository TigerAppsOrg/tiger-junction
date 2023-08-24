<script lang="ts">
import { searchResults, searchSettings } from "$lib/stores/recal";
import ClassicSearch from "../cards/classic/ClassicSearch.svelte";
import MinimalSearch from "../cards/minimal/MinimalSearch.svelte";

</script>

<div>
    <div>
        
    </div> <!-- * End Head -->
    <div>
        {#each $searchResults as course}
            {#if $searchSettings.style["Original Style"]}
                <ClassicSearch {course} />
            {:else}
                <MinimalSearch {course} />
            {/if}
        {/each}
    </div> <!-- * End Results -->
</div>