<script lang="ts">
    import Checkpill from "$lib/components/ui/Checkpill.svelte";
    import Modal from "$lib/components/ui/Modal.svelte";
    import StdButton from "$lib/components/ui/StdButton.svelte";
    import TogTog from "$lib/components/ui/TogTog.svelte";
    import { modalStore } from "$lib/stores/modal";
    import { DEFAULT_SETTINGS, searchSettings } from "$lib/stores/recal";

    export let showModal: boolean = false;

    // Filters with expandable sub-options
    const EXPANDABLE_FILTERS = [
        "No Conflicts",
        "Days",
        "Rating",
        "Dists",
        "Levels"
    ] as const;
    type ExpandableFilter = (typeof EXPANDABLE_FILTERS)[number];

    // Filter groups for organized display
    const filterGroups: Record<string, string[]> = {
        "Schedule & Availability": [
            "No Conflicts",
            "Open Only",
            "Days",
            "No Scheduled Final",
            "No Cancelled"
        ],
        "Course Attributes": ["Rating", "Dists", "Levels"],
        "Grading": ["PDFable", "PDF Only"]
    };

    // Helper text for filters (shown as tooltips)
    const filterHints: Record<string, string> = {
        "No Conflicts": "Based on your current schedule",
        "Open Only": "Only courses with available seats",
        "Days": "Filter by days of the week",
        "No Scheduled Final": "Exclude courses with final exams",
        "Rating": "Filter by course rating (0-5)",
        "Dists": "Distribution requirements",
        "Levels": "100-500 level courses",
        "PDFable": "Can be taken PDF",
        "PDF Only": "Must be taken PDF",
        "Show All": "Show all courses (ignores search)",
        "No Cancelled": "Hide cancelled courses"
    };

    let minInput: number = $searchSettings.filters["Rating"].min;
    let maxInput: number = $searchSettings.filters["Rating"].max;

    const saveSettings = () => modalStore.pop();

    const handleRatingInput = (e: Event, isMin: boolean) => {
        const target = e.target as HTMLInputElement;
        let value = parseFloat(target.value);
        if (Number.isNaN(value)) return;

        value = Math.max(0, Math.min(5, value));
        if (isMin) {
            minInput = Math.min(value, maxInput);
            $searchSettings.filters["Rating"].min = minInput;
        } else {
            maxInput = Math.max(value, minInput);
            $searchSettings.filters["Rating"].max = maxInput;
        }
    };

    const resetSearchSettings = () => {
        $searchSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        minInput = 0;
        maxInput = 5;
    };

    const setAllValues = (filter: string, value: boolean) => {
        Object.keys($searchSettings.filters[filter].values).forEach(k => {
            $searchSettings.filters[filter].values[k] = value;
        });
    };

    const resetRating = () => {
        minInput = 0;
        maxInput = 5;
        $searchSettings.filters["Rating"].min = 0;
        $searchSettings.filters["Rating"].max = 5;
    };

    const isExpandable = (filter: string): filter is ExpandableFilter =>
        EXPANDABLE_FILTERS.includes(filter as ExpandableFilter);

    const hasValues = (filter: string): boolean =>
        "values" in $searchSettings.filters[filter];
</script>

<Modal {showModal}>
    <div class="p-4 w-[80vw] max-w-2xl">
        <h1 class="text-lg font-bold mb-3">Advanced Search Settings</h1>

        <div class="flex flex-col gap-2">
            <!-- Filter Groups - Single Column with Inline Expansions -->
            {#each Object.entries(filterGroups) as [groupName, filters]}
                <div class="filter-group">
                    <div class="filter-group-header">
                        <span class="font-medium text-xs">{groupName}</span>
                    </div>
                    <div class="flex flex-wrap gap-1 p-1.5">
                        {#each filters as filter}
                            <div
                                class="filter-item"
                                title={filterHints[filter]}>
                                <Checkpill name={filter} category="filters" />
                            </div>
                        {/each}
                    </div>

                    <!-- Inline Expansions: render for any enabled expandable filter in this group -->
                    {#each filters.filter(f => isExpandable(f) && $searchSettings.filters[f].enabled) as filter}
                        <div class="filter-expansion">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="text-xs font-medium text-zinc-500">
                                    {filter === "No Conflicts"
                                        ? "Options"
                                        : filter}:
                                </span>

                                {#if filter === "Rating"}
                                    <!-- Rating: min/max inputs -->
                                    <input
                                        type="number"
                                        step="0.1"
                                        max="5"
                                        min="0"
                                        bind:value={minInput}
                                        placeholder="Min"
                                        class="p-1 h-6 std-area w-14 text-xs"
                                        on:input={e =>
                                            handleRatingInput(e, true)} />
                                    <span class="text-xs text-zinc-400"
                                        >to</span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        max="5"
                                        min="0"
                                        bind:value={maxInput}
                                        placeholder="Max"
                                        class="p-1 h-6 std-area w-14 text-xs"
                                        on:input={e =>
                                            handleRatingInput(e, false)} />
                                    <button
                                        class="quick-btn"
                                        on:click={resetRating}>Reset</button>
                                    <span class="text-xs text-zinc-400"
                                        >(no rating = 0)</span>
                                {:else if hasValues(filter)}
                                    <!-- Filters with values: render checkpills with secondary color -->
                                    {#each Object.keys($searchSettings.filters[filter].values) as value}
                                        <div class="secondary-pill">
                                            <Checkpill
                                                name={value}
                                                category={filter}
                                                scheme="2" />
                                        </div>
                                    {/each}
                                    <!-- All/None buttons (not for No Conflicts) -->
                                    {#if filter !== "No Conflicts"}
                                        <button
                                            class="quick-btn"
                                            on:click={() =>
                                                setAllValues(filter, true)}
                                            >All</button>
                                        <button
                                            class="quick-btn"
                                            on:click={() =>
                                                setAllValues(filter, false)}
                                            >None</button>
                                    {/if}
                                {/if}

                                <!-- Info tooltip for No Conflicts -->
                                {#if filter === "No Conflicts"}
                                    <div class="group relative">
                                        <button class="info-btn">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke-width="1.5"
                                                stroke="currentColor"
                                                class="w-3.5 h-3.5">
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                                            </svg>
                                        </button>
                                        <div class="tooltip">
                                            Shows only courses with at least one
                                            open, non-conflicting section per
                                            type (lecture, precept, etc.)
                                        </div>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
            {/each}

            <!-- Sort & Style Row -->
            <div class="grid grid-cols-2 gap-2">
                <div class="filter-group">
                    <div class="filter-group-header">
                        <span class="font-medium text-xs">Sort By</span>
                    </div>
                    <div class="flex flex-wrap gap-1 p-1.5">
                        <TogTog name="Rating" />
                        <TogTog name="Weighted Rating" />
                        <TogTog name="Capacity" />
                    </div>
                </div>

                <div class="filter-group">
                    <div class="filter-group-header">
                        <span class="font-medium text-xs">Display & Style</span>
                    </div>
                    <div class="flex flex-wrap gap-1 p-1.5">
                        <Checkpill name="Show All" category="filters" />
                        {#each Object.keys($searchSettings.style).filter(s => s !== "Show Time Marks") as style}
                            <Checkpill name={style} category="style" />
                        {/each}
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer Actions -->
        <div
            class="flex gap-2 mt-3 pt-2 border-t border-zinc-200 dark:border-zinc-700">
            <StdButton
                message="Reset"
                onClick={resetSearchSettings}
                scheme="1" />
            <StdButton message="Close" onClick={saveSettings} />
        </div>
    </div>
</Modal>

<style lang="postcss">
    .filter-group {
        @apply rounded-md border border-zinc-200 overflow-hidden;
        background-color: color-mix(in srgb, var(--bg-light) 95%, #000);
    }
    :global(.dark) .filter-group {
        @apply border-zinc-700;
        background-color: color-mix(in srgb, var(--bg-dark) 90%, #fff);
    }

    .filter-group-header {
        @apply px-2 py-1 border-b border-zinc-200 text-zinc-600;
        background-color: color-mix(in srgb, var(--bg-light) 90%, #000);
    }
    :global(.dark) .filter-group-header {
        @apply border-zinc-700 text-zinc-400;
        background-color: color-mix(in srgb, var(--bg-dark) 85%, #fff);
    }

    .filter-item {
        @apply inline-block;
    }

    .filter-expansion {
        @apply px-2 py-1.5 border-t border-zinc-100;
        background-color: color-mix(in srgb, var(--bg-light) 95%, #000);
    }
    :global(.dark) .filter-expansion {
        @apply border-zinc-700;
        background-color: color-mix(in srgb, var(--bg-dark) 90%, #fff);
    }

    /* Secondary pills are smaller than main filter pills */
    .secondary-pill :global(label .info) {
        @apply text-xs px-2 py-0.5;
    }

    .quick-btn {
        @apply text-xs px-1.5 py-0.5 rounded transition-colors text-zinc-500;
    }
    .quick-btn:hover {
        @apply bg-zinc-200 text-zinc-700;
    }
    :global(.dark) .quick-btn {
        @apply text-zinc-400;
    }
    :global(.dark) .quick-btn:hover {
        @apply bg-zinc-700 text-zinc-200;
    }

    .info-btn {
        @apply flex items-center justify-center w-5 h-5 text-zinc-400 rounded-full;
    }
    .info-btn:hover {
        @apply text-zinc-600 bg-zinc-200;
    }
    :global(.dark) .info-btn:hover {
        @apply text-zinc-300 bg-zinc-700;
    }

    .tooltip {
        @apply absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 p-2 text-xs bg-zinc-800 text-white rounded-md shadow-lg opacity-0 invisible transition-all duration-150 pointer-events-none;
    }
    .group:hover .tooltip {
        @apply opacity-100 visible;
    }
</style>
