<script lang="ts">
    import { onMount } from "svelte";
    import Saved from "./left/Saved.svelte";
    import SearchResults from "./left/SearchResults.svelte";
    import SearchBar from "./left/SearchBar.svelte";
    import Events from "./left/Events.svelte";
    import Handlebar from "./left/Handlebar.svelte";
    import { searchResults, currentSchedule } from "$lib/stores/recal";
    import { sectionRatio, isMobile } from "$lib/stores/styles";
    import { savedCourses } from "$lib/stores/rpool";

    // Element refs
    let sectionEl: HTMLElement;

    // Height tracking
    let availableHeight = 0;

    // Constants for height estimation
    const HANDLEBAR_HEIGHT = 16;
    const BASE_MIN_RATIO = 0.1;
    const BASE_MAX_RATIO = 0.9;
    const GAP_SIZE = 16; // Two gaps of 8px each

    // Height estimation constants
    const EVENTS_HEADER_HEIGHT = 24;
    const SAVED_HEADER_HEIGHT = 28;
    const SEARCH_HEADER_HEIGHT = 28;
    const CARD_HEIGHT = 75; // Average height per course card
    const INNER_GAP = 8;

    onMount(() => {
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                availableHeight = entry.contentRect.height;
            }
        });

        resizeObserver.observe(sectionEl);
        return () => resizeObserver.disconnect();
    });

    // Get item counts from stores
    $: savedCount = $savedCourses[$currentSchedule]?.length ?? 0;
    $: searchCount = $searchResults.length;

    // Estimate content heights based on item counts
    $: estimatedTopHeight = EVENTS_HEADER_HEIGHT + INNER_GAP +
        SAVED_HEADER_HEIGHT + (savedCount * CARD_HEIGHT);
    $: estimatedBottomHeight = SEARCH_HEADER_HEIGHT + (searchCount * CARD_HEIGHT);

    // Show handlebar when there are search results AND content would overflow
    $: hasSearchResults = searchCount > 0;
    $: totalEstimatedContent = estimatedTopHeight + estimatedBottomHeight + INNER_GAP;
    $: showHandlebar = !$isMobile && hasSearchResults && totalEstimatedContent > availableHeight;

    // Calculate usable height (minus handlebar and gaps when shown)
    $: usableHeight = showHandlebar
        ? Math.max(0, availableHeight - HANDLEBAR_HEIGHT - GAP_SIZE)
        : availableHeight;

    // Content-based ratio constraints
    $: maxRatio = usableHeight > 0
        ? Math.min(BASE_MAX_RATIO, estimatedTopHeight / usableHeight)
        : BASE_MAX_RATIO;
    $: minRatio = usableHeight > 0
        ? Math.max(BASE_MIN_RATIO, 1 - (estimatedBottomHeight / usableHeight))
        : BASE_MIN_RATIO;

    // Default ratio based on content proportions
    function getDefaultRatio(): number {
        if (estimatedTopHeight + estimatedBottomHeight === 0) return 0.5;
        const ratio = estimatedTopHeight / (estimatedTopHeight + estimatedBottomHeight);
        return Math.max(minRatio, Math.min(maxRatio, ratio));
    }

    // Get effective ratio (user-set or default), clamped to valid range
    $: effectiveRatio = Math.max(minRatio, Math.min(maxRatio, $sectionRatio ?? getDefaultRatio()));

    // Calculate heights
    $: rawTopHeight = Math.round(usableHeight * effectiveRatio);

    // Cap at estimated content height to prevent gaps
    $: topHeight = Math.min(rawTopHeight, estimatedTopHeight);
    $: bottomHeight = usableHeight - topHeight;

    // Style strings
    $: topSectionStyle = showHandlebar ? `height: ${topHeight}px;` : "";
    $: bottomSectionStyle = showHandlebar ? `height: ${bottomHeight}px;` : "";

    function handleResize(e: CustomEvent<{ ratio: number }>) {
        if (e.detail.ratio === -1) {
            sectionRatio.reset();
        } else {
            // Constrain to content-based bounds
            const clampedRatio = Math.max(minRatio, Math.min(maxRatio, e.detail.ratio));
            sectionRatio.set(clampedRatio);
        }
    }
</script>

<div class="w-full flex flex-col h-full overflow-y-hidden">
    <div>
        <SearchBar />
    </div>
    <section
        bind:this={sectionEl}
        class="flex-1 overflow-y-hidden mt-2 flex flex-col gap-2">
        <!-- Top Section: Events + Saved -->
        <div
            class="flex flex-col gap-2 shrink-0 overflow-y-hidden"
            style={topSectionStyle}>
            <div class="shrink-0">
                <Events />
            </div>
            <div class="flex-1 overflow-y-hidden min-h-0">
                <Saved />
            </div>
        </div>

        <!-- Handlebar -->
        {#if showHandlebar}
            <Handlebar
                on:resize={handleResize}
                containerHeight={usableHeight} />
        {/if}

        <!-- Bottom Section: SearchResults -->
        {#if hasSearchResults}
            <div
                class="flex-1 overflow-y-hidden min-h-0"
                style={bottomSectionStyle}>
                <SearchResults />
            </div>
        {/if}
    </section>
</div>
