<script lang="ts">
    import { research, searchResults } from "$lib/stores/recal";
    import { darkTheme } from "$lib/stores/styles";
    import CourseCard from "./elements/CourseCard.svelte";

    $: resetKey = [$searchResults, $darkTheme, $research];
</script>

{#if $searchResults.length > 0}
    <main class="overflow-y-hidden flex flex-col min-h-[96px]">
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
        <!-- * End Results -->
    </main>
{/if}

<style lang="postcss">
    main {
        flex: 1 1.3 auto;
    }
</style>
