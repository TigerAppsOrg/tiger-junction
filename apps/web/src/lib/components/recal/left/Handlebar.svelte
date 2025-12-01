<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let containerHeight: number;

    const dispatch = createEventDispatcher<{
        resize: { ratio: number };
    }>();

    let isDragging = false;
    let isHovering = false;
    let handlebarEl: HTMLElement;

    function handlePointerDown(e: PointerEvent) {
        isDragging = true;
        handlebarEl.setPointerCapture(e.pointerId);
        document.body.style.cursor = "row-resize";
        document.body.style.userSelect = "none";

        // Add window-level listeners to ensure cleanup even if pointer leaves element/window
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", handlePointerUp);
    }

    function handlePointerMove(e: PointerEvent) {
        if (!isDragging) return;

        // Calculate new ratio based on pointer position relative to container
        const containerRect =
            handlebarEl.parentElement?.getBoundingClientRect();
        if (!containerRect) return;

        const relativeY = e.clientY - containerRect.top;
        let newRatio = relativeY / containerHeight;

        // Clamp ratio to prevent sections from being too small
        newRatio = Math.max(0.15, Math.min(0.85, newRatio));

        dispatch("resize", { ratio: newRatio });
    }

    function handlePointerUp(e: PointerEvent) {
        if (!isDragging) return;
        isDragging = false;

        // Clean up window-level listeners
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);

        // Release pointer capture if we still have it
        if (handlebarEl && e.pointerId !== undefined) {
            try {
                handlebarEl.releasePointerCapture(e.pointerId);
            } catch {
                // Pointer capture may already be released
            }
        }

        document.body.style.cursor = "";
        document.body.style.userSelect = "";
    }

    function handleDoubleClick() {
        dispatch("resize", { ratio: -1 }); // -1 signals reset to auto
    }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
    bind:this={handlebarEl}
    class="handlebar-zone"
    on:pointerenter={() => (isHovering = true)}
    on:pointerleave={() => {
        if (!isDragging) isHovering = false;
    }}
    on:pointerdown={handlePointerDown}
    on:dblclick={handleDoubleClick}>
    <!-- Full-width horizontal line -->
    <div class="handlebar-line"></div>

    <!-- Center pill with up/down arrows -->
    <div class="handlebar-pill">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="w-3 h-3">
            <path d="M12 4l-4 4h8l-4-4z" />
            <path d="M12 20l4-4H8l4 4z" />
        </svg>
    </div>
</div>

<style lang="postcss">
    .handlebar-zone {
        @apply relative flex items-center justify-center shrink-0;
        height: 16px;
        cursor: row-resize;
        /* Expand clickable area */
        margin: -2px 0;
        padding: 2px 0;
    }

    .handlebar-line {
        @apply absolute left-0 right-0 top-1/2 -translate-y-1/2;
        @apply bg-zinc-300 dark:bg-zinc-600;
        @apply transition-opacity duration-150;
        height: 2px;
    }

    .handlebar-pill {
        @apply relative z-10 flex items-center justify-center rounded-full;
        @apply bg-zinc-300 dark:bg-zinc-600;
        @apply transition-opacity duration-150;
        width: 36px;
        height: 12px;
    }

    .handlebar-pill svg {
        @apply text-zinc-500 dark:text-zinc-400;
    }
</style>
