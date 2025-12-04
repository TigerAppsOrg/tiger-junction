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
    let sectionEl: HTMLElement | undefined = $state();
    let eventsWrapperEl: HTMLElement | undefined = $state();

    // Height tracking
    let availableHeight = $state(0);

    // Content heights from children (dynamic measurement)
    let savedContentHeight = $state(0);
    let searchContentHeight = $state(0);
    let eventsHeight = $state(0);

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

        if (sectionEl) resizeObserver.observe(sectionEl);
        return () => resizeObserver.disconnect();
    });

    // Measure events section when it changes (collapsed/expanded)
    $effect(() => {
        if (eventsWrapperEl && $isEventOpen !== undefined) {
            tick().then(() => {
                eventsHeight = eventsWrapperEl?.offsetHeight ?? 0;
            });
        }
    });

    // Calculate total content heights from dynamic measurements
    let topContentHeight = $derived(
        eventsHeight + INNER_GAP + savedContentHeight
    );
    let bottomContentHeight = $derived(searchContentHeight);

    // Show handlebar when there are search results AND content would overflow
    let hasSearchResults = $derived($searchResults.length > 0);
    let totalContent = $derived(
        topContentHeight + bottomContentHeight + INNER_GAP
    );
    let showHandlebar = $derived(
        !$isMobile && hasSearchResults && totalContent > availableHeight
    );

    // Calculate usable height (minus handlebar and gaps when shown)
    let usableHeight = $derived(
        showHandlebar
            ? Math.max(0, availableHeight - HANDLEBAR_HEIGHT - GAP_SIZE)
            : availableHeight
    );

    // Content-based ratio constraints (using measured heights)
    let maxRatio = $derived(
        usableHeight > 0
            ? Math.min(BASE_MAX_RATIO, topContentHeight / usableHeight)
            : BASE_MAX_RATIO
    );
    let minRatio = $derived(
        usableHeight > 0
            ? Math.max(BASE_MIN_RATIO, 1 - bottomContentHeight / usableHeight)
            : BASE_MIN_RATIO
    );

    // Default ratio for handlebar position (0.5 = middle)
    function getDefaultRatio(): number {
        return 0.5;
    }

    // Get effective ratio (user-set or default), clamped to valid range
    let effectiveRatio = $derived(
        Math.max(
            minRatio,
            Math.min(maxRatio, $sectionRatio ?? getDefaultRatio())
        )
    );

    // Calculate heights
    let rawTopHeight = $derived(Math.round(usableHeight * effectiveRatio));

    // Cap at measured content height to prevent gaps
    let topHeight = $derived(Math.min(rawTopHeight, topContentHeight));
    let bottomHeight = $derived(
        Math.min(usableHeight - topHeight, bottomContentHeight)
    );

    // Hide handlebar if content actually fits after capping
    let actuallyShowHandlebar = $derived(
        showHandlebar && topHeight + bottomHeight >= usableHeight - 10
    );

    // Style strings
    let topSectionStyle = $derived(
        actuallyShowHandlebar ? `height: ${topHeight}px;` : ""
    );
    let bottomSectionStyle = $derived(
        actuallyShowHandlebar ? `height: ${bottomHeight}px;` : ""
    );

    function handleResize(detail: { ratio: number }) {
        if (detail.ratio === -1) {
            sectionRatio.reset();
        } else {
            // Constrain to content-based bounds
            const clampedRatio = Math.max(
                minRatio,
                Math.min(maxRatio, detail.ratio)
            );
            sectionRatio.set(clampedRatio);
        }
    }
</script>

<svelte:window onresize={handleWindowResize} />

<div class="w-full flex flex-col h-full overflow-y-hidden">
    <div>
        <SearchBar />
    </div>
    <section
        bind:this={sectionEl}
        class="flex-1 overflow-y-hidden mt-2 flex flex-col gap-2">
        <!-- Top Section: Events + Saved -->
        <div
            class="flex flex-col gap-2 overflow-y-hidden min-h-0"
            class:shrink-0={actuallyShowHandlebar}
            style={topSectionStyle}>
            <div bind:this={eventsWrapperEl} class="shrink-0">
                <Events />
            </div>
            <div class="overflow-y-hidden min-h-0 flex flex-col max-h-full">
                <Saved bind:contentHeight={savedContentHeight} />
            </div>
        </div>

        <!-- Handlebar -->
        {#if actuallyShowHandlebar}
            <Handlebar onresize={handleResize} containerHeight={usableHeight} />
        {/if}

        <!-- Bottom Section: SearchResults -->
        {#if hasSearchResults}
            <div
                class="min-h-0 flex flex-col"
                class:shrink-0={actuallyShowHandlebar}
                class:overflow-y-hidden={actuallyShowHandlebar}
                style={bottomSectionStyle}>
                <SearchResults bind:contentHeight={searchContentHeight} />
            </div>
        {/if}
    </section>
</div>
