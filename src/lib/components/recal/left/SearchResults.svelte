<script lang="ts">
    import { research, searchResults } from "$lib/stores/recal";
    import CourseCard from "./elements/CourseCard.svelte";
    import { darkTheme } from "$lib/stores/state";

    $: resetKey = [$searchResults, $darkTheme, $research];
</script>

{#if $searchResults.length > 0}
    <div class="max-h-full mt-2">
        <div class="text-base font-normal dark:text-zinc-100 ml-1">
            {$searchResults.length} Search
            {$searchResults.length === 1 ? "Result" : "Results"}
        </div>
        <!-- * End Head -->

        <div
            class="flex flex-col overflow-auto border-2 rounded-sm
    max-h-[49vh]">
            <div class="overflow-y-auto">
                {#key resetKey}
                    {#each $searchResults as course}
                        <CourseCard {course} />
                    {/each}
                {/key}
            </div>
        </div>
        <!-- * End Results -->
    </div>
{/if}
