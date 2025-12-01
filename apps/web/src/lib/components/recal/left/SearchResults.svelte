<script lang="ts">
    import { tick } from "svelte";
    import { research, searchResults } from "$lib/stores/recal";
    import { darkTheme } from "$lib/stores/styles";
    import CourseCard from "./elements/CourseCard.svelte";

    // Export for parent to read content height
    export let contentHeight: number = 0;

    // Element refs for measurement
    let headerEl: HTMLElement;
    let scrollContainerEl: HTMLElement;

    $: resetKey = [$searchResults, $darkTheme, $research];

    // Measure content height after DOM updates when content changes
    $: if ($searchResults.length > 0 && headerEl) {
        tick().then(() => {
            const headerHeight = headerEl?.offsetHeight ?? 0;
            const cardsHeight = scrollContainerEl?.scrollHeight ?? 0;
            contentHeight = headerHeight + cardsHeight;
        });
    }
</script>

{#if $searchResults.length > 0}
    <div
        bind:this={headerEl}
        class="text-base font-normal dark:text-zinc-100 ml-1 serif-lowercase">
        {$searchResults.length} Search
        {$searchResults.length === 1 ? "Result" : "Results"}
    </div>
    <!-- * End Head -->

    <div
        class="flex flex-col overflow-y-hidden border-2
        dark:border-zinc-800
        rounded-sm">
        <div
            bind:this={scrollContainerEl}
            class="overflow-y-auto"
            style="scrollbar-gutter: stable;">
            {#key resetKey}
                {#each $searchResults as course}
                    <CourseCard {course} />
                {/each}
            {/key}
        </div>
    </div>
{/if}
