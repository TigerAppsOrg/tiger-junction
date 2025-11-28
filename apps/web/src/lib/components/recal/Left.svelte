<script lang="ts">
    import Saved from "./left/Saved.svelte";
    import SearchResults from "./left/SearchResults.svelte";
    import SearchBar from "./left/SearchBar.svelte";
    import Events from "./left/Events.svelte";
    import { onMount } from "svelte";

    // --- Split logic between Saved and SearchResults ---

    let savedHeight = 200;          // initial Saved height in px
    const MIN_SAVED = 80;           // minimum Saved height
    const MIN_RESULTS = 120;        // minimum Results height

    let splitEl: HTMLDivElement | null = null;

    let dragging = false;
    let startY = 0;
    let startHeight = 0;

    function onPointerDown(e: PointerEvent) {
        e.preventDefault();
        dragging = true;
        startY = e.clientY;
        startHeight = savedHeight;

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        window.addEventListener("pointercancel", onPointerUp);
    }

    function onPointerMove(e: PointerEvent) {
        if (!dragging || !splitEl) return;

        const dy = e.clientY - startY;
        const containerHeight = splitEl.getBoundingClientRect().height;

        const maxSaved = Math.max(MIN_SAVED, containerHeight - MIN_RESULTS);
        const next = startHeight + dy;

        savedHeight = Math.max(MIN_SAVED, Math.min(maxSaved, next));
    }

    function onPointerUp(_e: PointerEvent) {
        if (!dragging) return;

        dragging = false;
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
    }

    // Clamp Saved height whenever the split container resizes
    onMount(() => {
        if (!splitEl || typeof ResizeObserver === "undefined") return;

        const ro = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;

            const height = entry.contentRect.height;
            const maxSaved = Math.max(MIN_SAVED, height - MIN_RESULTS);

            if (savedHeight > maxSaved) {
                savedHeight = maxSaved;
            }
        });

        ro.observe(splitEl);

        return () => {
            ro.disconnect();
        };
    });
</script>

<div class="w-full flex flex-col h-full overflow-y-hidden">
    <div>
        <SearchBar />
    </div>

    <section class="flex-1 overflow-y-hidden mt-2 flex flex-col min-h-0">
        <div class="min-h-[24px] flex-shrink-0">
            <Events />
        </div>

        <!-- Split area: Saved + handle + Results -->
        <div class="flex-1 min-h-0">
            <div
                class="split-container"
                bind:this={splitEl}
                style={`--saved-height: ${savedHeight}px;`}
            >
                <div class="saved-panel">
                    <Saved />
                </div>

                <div
                    class="resize-handle"
                    role="separator"
                    aria-orientation="horizontal"
                    aria-label="Resize Saved panel"
                    on:pointerdown={onPointerDown}
                />

                <div class="results-panel">
                    <SearchResults />
                </div>
            </div>
        </div>
    </section>
</div>

<style lang="postcss">
    .split-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
        gap: 0.25rem;
    }

    /* Saved: fixed (adjustable) height, internal scroll */
    .saved-panel {
        flex: 0 0 var(--saved-height, 200px);
        min-height: 80px; /* keep in sync with MIN_SAVED */
        @apply overflow-y-auto flex flex-col;
    }

    /* Results: fills remaining space, internal scroll */
    .results-panel {
        flex: 1 1 auto;
        min-height: 120px; /* keep in sync with MIN_RESULTS */
        @apply overflow-y-auto flex flex-col;
    }

    /* Base handle (for light theme) */
    .resize-handle {
    position: relative;
    flex: 0 0 10px;
    cursor: row-resize;
    border-radius: 9999px;
    
    background-color: #d4d4d8 !important;  
    border: 1px solid #d4d4d8 !important;

    transition: background-color 120ms ease, border-color 120ms ease;
    }

    .resize-handle::before {
    content: "";
    position: absolute;
    left: 50%;
    top: 50%;
    width: 40px;
    height: 3px;
    border-radius: 9999px;
    background-color: #f9fafb;         
    transform: translate(-50%, -50%);
    }

    .resize-handle:hover {
    background-color: #71717a !important;
    border-color: #71717a !important;
    }

    /* Dark theme variant */
    :is(.dark .resize-handle) {
    background-color: rgba(255, 255, 255, 0.10) !important;
    border-color: rgba(255, 255, 255, 0.22) !important;
    }

    :is(.dark .resize-handle::before) {
    background-color: rgba(255, 255, 255, 0.85);
    }

    :is(.dark .resize-handle:hover) {
    background-color: rgba(255, 255, 255, 0.16) !important;
    }

</style>
