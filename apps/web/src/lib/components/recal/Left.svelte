<script lang="ts">
    import { onMount, tick } from "svelte";
    import Saved from "./left/Saved.svelte";
    import SearchResults from "./left/SearchResults.svelte";
    import SearchBar from "./left/SearchBar.svelte";
    import Events from "./left/Events.svelte";
    import Handlebar from "./left/Handlebar.svelte";
    import { searchResults, recal } from "$lib/stores/recal";
    import { sectionRatio, isMobile, isEventOpen } from "$lib/stores/styles";

    // Element refs
    let sectionEl: HTMLElement;
    let eventsWrapperEl: HTMLElement;

    // Height tracking
    let availableHeight = 0;

    // Content heights from children (dynamic measurement)
    let savedContentHeight = 0;
    let searchContentHeight = 0;
    let eventsHeight = 0;

    // Constants
    const HANDLEBAR_HEIGHT = 16;
    const BASE_MIN_RATIO = 0.1;
    const BASE_MAX_RATIO = 0.9;
    const GAP_SIZE = 16; // Two gaps of 8px each
    const INNER_GAP = 8;

    // Force update on window resize
    function handleWindowResize() {
        if (sectionEl) {
            availableHeight = sectionEl.getBoundingClientRect().height;
        }
        $recal = !$recal; // Force re-render like CalBox click does
    }

    onMount(() => {
        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                availableHeight = entry.contentRect.height;
            }
        });

        resizeObserver.observe(sectionEl);
        return () => resizeObserver.disconnect();
    });

    // Measure events section when it changes (collapsed/expanded)
    $: if (eventsWrapperEl && $isEventOpen !== undefined) {
        tick().then(() => {
            eventsHeight = eventsWrapperEl?.offsetHeight ?? 0;
        });
    }

    // Calculate total content heights from dynamic measurements
    $: topContentHeight = eventsHeight + INNER_GAP + savedContentHeight;
    $: bottomContentHeight = searchContentHeight;

    // Show handlebar when there are search results AND content would overflow
    $: hasSearchResults = $searchResults.length > 0;
    $: totalContent = topContentHeight + bottomContentHeight + INNER_GAP;
    $: showHandlebar =
        !$isMobile && hasSearchResults && totalContent > availableHeight;

    // Calculate usable height (minus handlebar and gaps when shown)
    $: usableHeight = showHandlebar
        ? Math.max(0, availableHeight - HANDLEBAR_HEIGHT - GAP_SIZE)
        : availableHeight;

    // Content-based ratio constraints (using measured heights)
    $: maxRatio =
        usableHeight > 0
            ? Math.min(BASE_MAX_RATIO, topContentHeight / usableHeight)
            : BASE_MAX_RATIO;
    $: minRatio =
        usableHeight > 0
            ? Math.max(BASE_MIN_RATIO, 1 - bottomContentHeight / usableHeight)
            : BASE_MIN_RATIO;

    // Default ratio for handlebar position (0.5 = middle)
    function getDefaultRatio(): number {
        return 0.5;
    }

    // Get effective ratio (user-set or default), clamped to valid range
    $: effectiveRatio = Math.max(
        minRatio,
        Math.min(maxRatio, $sectionRatio ?? getDefaultRatio())
    );

    // Calculate heights
    $: rawTopHeight = Math.round(usableHeight * effectiveRatio);

    // Cap at measured content height to prevent gaps
    $: topHeight = Math.min(rawTopHeight, topContentHeight);
    $: bottomHeight = usableHeight - topHeight;

    // Style strings
    $: topSectionStyle = showHandlebar ? `height: ${topHeight}px;` : "";
    $: bottomSectionStyle = showHandlebar ? `height: ${bottomHeight}px;` : "";

    function handleResize(e: CustomEvent<{ ratio: number }>) {
        if (e.detail.ratio === -1) {
            sectionRatio.reset();
        } else {
            // Constrain to content-based bounds
            const clampedRatio = Math.max(
                minRatio,
                Math.min(maxRatio, e.detail.ratio)
            );
            sectionRatio.set(clampedRatio);
        }
    }
</script>

<svelte:window on:resize={handleWindowResize} />

<div class="w-full flex flex-col h-full overflow-y-hidden">
    <div>
        <SearchBar />
    </div>
    <section
        bind:this={sectionEl}
        class="flex-1 overflow-y-hidden mt-2 flex flex-col gap-2">
        <!-- Top Section: Events + Saved -->
        <div
            class="flex flex-col gap-2 overflow-y-hidden min-h-0 shrink-0"
            style={topSectionStyle}>
            <div bind:this={eventsWrapperEl} class="shrink-0">
                <Events />
            </div>
            <div class="flex-1 overflow-y-hidden min-h-0 flex flex-col">
                <Saved bind:contentHeight={savedContentHeight} />
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
                class="min-h-0 flex flex-col flex-1"
                class:shrink-0={showHandlebar}
                class:overflow-y-hidden={showHandlebar}
                class:overflow-y-auto={!showHandlebar}
                style={bottomSectionStyle}>
                <SearchResults bind:contentHeight={searchContentHeight} />
            </div>
        {/if}
    </section>
</div>
