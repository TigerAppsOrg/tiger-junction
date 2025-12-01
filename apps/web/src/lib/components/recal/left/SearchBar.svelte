<script lang="ts">
    import { currentTerm } from "$lib/changeme";
    import { modalStore } from "$lib/stores/modal";
    import {
        currentSchedule,
        isResult,
        ready,
        research,
        scheduleCourseMeta,
        searchCourseData,
        searchResults,
        searchSettings
    } from "$lib/stores/recal";
    import { sectionData } from "$lib/stores/rsections";
    import { calColors, darkTheme, getStyles } from "$lib/stores/styles";

    // Adjust HSL lightness: positive = darker, negative = lighter
    const adjustLightness = (hsl: string, amount: number): string => {
        const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
        if (!match) return hsl;
        const [, h, s, l] = match;
        const newL = Math.max(0, Math.min(100, parseInt(l) - amount));
        return `hsl(${h}, ${s}%, ${newL}%)`;
    };
    import { toastStore } from "$lib/stores/toast";
    import type { SupabaseClient } from "@supabase/supabase-js";
    import { getContext } from "svelte";
    import { hoveredCourse } from "../../../scripts/ReCal+/calendar";

    const supabase = getContext("supabase") as SupabaseClient;

    let inputBar: HTMLInputElement;
    let searchFocused = false;

    // Number of results, under which sections are added automatically
    const THRESHOLD = 20;

    // Update search results when params change
    $: autoTrig(
        $searchSettings,
        $searchCourseData,
        $currentTerm,
        $currentSchedule,
        $research,
        $scheduleCourseMeta
    );
    const autoTrig = (...params: unknown[]) => {
        triggerSearch();
    };

    const triggerSearch = () => {
        if (!inputBar || inputBar.value === undefined) return;
        searchResults.search(inputBar.value, $currentTerm, $searchSettings);

        // Handle isResult flag
        if ($searchResults.length > 0) isResult.set(true);
        else {
            isResult.set(false);
            hoveredCourse.set(null);
        }

        // If results are less than threshold, add sections
        if ($searchResults.length < THRESHOLD)
            for (let i = 0; i < $searchResults.length; i++)
                sectionData.add(supabase, $currentTerm, $searchResults[i].id);
    };

    // Re-run when calColors changes (getStyles uses get() internally)
    let cssVarStyles: string;
    $: $calColors, (cssVarStyles = getStyles("2"));

    // Adjust gradient colors: darken in light mode, lighten in dark mode
    $: adj = $darkTheme ? -25 : 15;
    $: gradColors = [
        adjustLightness($calColors["0"], adj),
        adjustLightness($calColors["1"], adj),
        adjustLightness($calColors["2"], adj),
        adjustLightness($calColors["4"], adj),
        adjustLightness($calColors["5"], adj)
    ];
</script>

<div class="flex flex-col justify-between h-16" style={cssVarStyles}>
    <div
        class="h-4 text-xs w-full
    flex justify-between gap-1 items-center">
        <button
            class="togglebutton
        {$searchSettings.filters['Show All'].enabled ? 'enabled' : 'disabled'}"
            on:click={() =>
                ($searchSettings.filters["Show All"].enabled =
                    !$searchSettings.filters["Show All"].enabled)}>
            Show All
        </button>
        <button
            class="togglebutton
        {$searchSettings.filters['No Conflicts'].enabled
                ? 'enabled'
                : 'disabled'}"
            on:click={() =>
                ($searchSettings.filters["No Conflicts"].enabled =
                    !$searchSettings.filters["No Conflicts"].enabled)}>
            No Conflicts
        </button>
    </div>
    <div class="flex gap-2">
        <input
            type="text"
            placeholder="Search..."
            class="search-input std-area rounded-md section-header serif-lowercase text-sm"
            bind:this={inputBar}
            on:input={triggerSearch}
            on:focus={() => (searchFocused = true)}
            on:blur={() => (searchFocused = false)} />
        <button
            class="adv-search {searchFocused ? 'focused' : ''}"
            on:click={() => {
                if (!$ready)
                    toastStore.add("error", "Please wait for the data to load");
                else modalStore.push("adv");
            }}>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke={searchFocused ? "url(#theme-gradient)" : "currentColor"}
                class="w-6 h-6 gear-icon">
                <defs>
                    <linearGradient
                        id="theme-gradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%">
                        <stop offset="0%" stop-color={gradColors[0]}>
                            <animate
                                attributeName="stop-color"
                                values={`${gradColors[0]};${gradColors[1]};${gradColors[2]};${gradColors[3]};${gradColors[4]};${gradColors[0]}`}
                                dur="3s"
                                repeatCount="indefinite" />
                        </stop>
                        <stop offset="50%" stop-color={gradColors[2]}>
                            <animate
                                attributeName="stop-color"
                                values={`${gradColors[2]};${gradColors[3]};${gradColors[4]};${gradColors[0]};${gradColors[1]};${gradColors[2]}`}
                                dur="3s"
                                repeatCount="indefinite" />
                        </stop>
                        <stop offset="100%" stop-color={gradColors[4]}>
                            <animate
                                attributeName="stop-color"
                                values={`${gradColors[4]};${gradColors[0]};${gradColors[1]};${gradColors[2]};${gradColors[3]};${gradColors[4]}`}
                                dur="3s"
                                repeatCount="indefinite" />
                        </stop>
                    </linearGradient>
                </defs>
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        </button>
    </div>
</div>

<style lang="postcss">
    .search-input {
        @apply flex-1 p-2 h-10 w-20;
    }

    .adv-search {
        @apply h-10 w-10 flex justify-center items-center
        dark:text-zinc-100;
    }

    .adv-search:hover svg {
        animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    .togglebutton {
        @apply flex-1 h-full rounded-sm duration-100;
    }

    .enabled {
        background-color: var(--bg);
        color: var(--text);
    }

    .enabled:hover {
        background-color: var(--bg-hover);
    }

    .disabled {
        @apply bg-zinc-200 dark:bg-zinc-700 text-zinc-900
    dark:text-zinc-100;
    }

    .disabled:hover {
        @apply bg-zinc-300 dark:bg-zinc-600;
    }
</style>
