<script lang="ts">
    import { tick } from "svelte";
    import { currentSchedule, ready, recal } from "$lib/stores/recal";
    import CourseCard from "./elements/CourseCard.svelte";
    import { savedCourses } from "$lib/stores/rpool";
    import { calColors } from "$lib/stores/styles";
    import Loader from "$lib/components/ui/Loader.svelte";
    import { modalStore } from "$lib/stores/modal";

    // Export for parent to read content height (bindable)
    let { contentHeight = $bindable(0) }: { contentHeight?: number } = $props();

    // Element refs for measurement
    let headerEl: HTMLElement | undefined = $state();
    let scrollContainerEl: HTMLElement | undefined = $state();

    // Use toSorted() to avoid mutating the original array (returns new array reference)
    let saved = $derived(
        $savedCourses[$currentSchedule]
            ? [...$savedCourses[$currentSchedule]].sort((a, b) =>
                  a.code.localeCompare(b.code)
              )
            : []
    );

    // Create a stable key that changes when courses change
    let savedKey = $derived(saved.map(c => c.id).join(","));

    // Create a key for color changes (serialize the object)
    let colorKey = $derived(JSON.stringify($calColors));

    // Measure content height after DOM updates when content changes
    $effect(() => {
        if (saved && headerEl) {
            tick().then(() => {
                const headerHeight = headerEl?.offsetHeight ?? 0;
                const cardsHeight = scrollContainerEl?.scrollHeight ?? 0;
                contentHeight = headerHeight + cardsHeight;
            });
        }
    });
</script>

{#key savedKey + $recal}
    {#if saved && $ready}
        <div
            bind:this={headerEl}
            class="text-base font-normal dark:text-zinc-100 ml-1
                    flex items-center justify-between serif-lowercase section-header">
            <span>
                {saved.length} Saved
                {saved.length === 1 ? "Course" : "Courses"}
            </span>
            <button
                onclick={() => modalStore.push("exportCal")}
                class="flex items-center gap-1 text-sm">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="w-4 h-4 calbut">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                </svg>

                <p class="calbut serif-lowercase section-header">Export</p>
            </button>
        </div>

        {#if saved.length > 0}
            <div class="flex flex-col rounded-sm overflow-y-hidden max-h-full">
                <div
                    bind:this={scrollContainerEl}
                    class="overflow-y-auto flex-1"
                    style="scrollbar-gutter: stable;">
                    {#key savedKey + colorKey}
                        {#each saved as course (course.id)}
                            <CourseCard {course} category="saved" />
                        {/each}
                    {/key}
                </div>
            </div>
        {/if}
    {:else}
        <div class="flex items-center gap-2 mt-2">
            <Loader />
            <span> Loading... </span>
        </div>
    {/if}
{/key}

<style lang="postcss">
    :global(.dark) .calbut {
        @apply text-zinc-100;
    }

    .calbut:hover {
        @apply text-zinc-600 duration-150;
    }

    :global(.dark) .calbut:hover {
        @apply text-zinc-300;
    }
</style>
