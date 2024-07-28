<script lang="ts">
    import { research, searchResults } from "$lib/stores/recal";
    import { darkTheme } from "$lib/stores/styles";
    import CourseCard from "./elements/CourseCard.svelte";

    $: resetKey = [$searchResults, $darkTheme, $research];
</script>

{#if $searchResults.length > 0}
    <div class="text-base font-normal dark:text-zinc-100 ml-1">
        {$searchResults.length} Search
        {$searchResults.length === 1 ? "Result" : "Results"}
    </div>
    <!-- * End Head -->

    <div
        class="flex flex-col overflow-y-hidden border-2
        dark:border-zinc-800
        rounded-sm">
        <div class="overflow-y-auto">
            {#key resetKey}
                {#each $searchResults as course}
                    <CourseCard {course} />
                {/each}
            {/key}
        </div>
    </div>
{/if}
