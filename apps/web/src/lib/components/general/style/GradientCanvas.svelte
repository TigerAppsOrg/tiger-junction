<script lang="ts">
    import type { GradientConfig } from "$lib/stores/styles";
    import { hslToRGB, hslToRGBComponents } from "$lib/scripts/convert";

    let {
        gradients = [],
        selectedId = null,
        globalOpacity = 0.15,
        onselect,
        onmove
    }: {
        gradients?: GradientConfig[];
        selectedId?: string | null;
        globalOpacity?: number;
        onselect?: (detail: { id: string }) => void;
        onmove?: (detail: { id: string; x: number; y: number }) => void;
    } = $props();

    let canvasEl: HTMLElement | undefined = $state();
    let isDragging = $state(false);
    let draggedGradientId: string | null = $state(null);
    let justFinishedDragging = $state(false);

    // Generate preview gradient CSS
    let previewCSS = $derived(
        gradients.length > 0
            ? gradients
                  .map(g => {
                      const rgb = hslToRGBComponents(g.color);
                      const scaledBlur = (g.size / 100) * g.blur;
                      return `radial-gradient(${g.shape} at ${g.x}% ${g.y}%, rgba(${rgb}, ${globalOpacity * g.opacity}) 0%, transparent ${scaledBlur}%)`;
                  })
                  .join(", ")
            : "none"
    );

    function handlePointerDown(e: PointerEvent, gradientId: string) {
        e.stopPropagation();
        isDragging = true;
        draggedGradientId = gradientId;
        onselect?.({ id: gradientId });

        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", handlePointerUp);
    }

    function handlePointerMove(e: PointerEvent) {
        if (!isDragging || !draggedGradientId || !canvasEl) return;

        const rect = canvasEl.getBoundingClientRect();
        const x = Math.max(
            0,
            Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)
        );
        const y = Math.max(
            0,
            Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)
        );

        onmove?.({ id: draggedGradientId, x, y });
    }

    function handlePointerUp() {
        isDragging = false;
        draggedGradientId = null;
        justFinishedDragging = true;

        document.body.style.cursor = "";
        document.body.style.userSelect = "";

        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);

        // Reset flag after a short delay to allow click event to be ignored
        setTimeout(() => {
            justFinishedDragging = false;
        }, 10);
    }

    function handleCanvasClick(e: MouseEvent) {
        // Only deselect if clicking on canvas background and not just finished dragging
        if (e.target === canvasEl && !justFinishedDragging) {
            onselect?.({ id: "" });
        }
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    bind:this={canvasEl}
    class="canvas-container"
    style="background: {previewCSS};"
    onclick={handleCanvasClick}>
    <!-- Grid overlay -->
    <div class="grid-overlay"></div>

    <!-- Gradient handles -->
    {#each gradients as gradient (gradient.id)}
        <button
            type="button"
            class="gradient-handle"
            class:selected={gradient.id === selectedId}
            class:dragging={gradient.id === draggedGradientId}
            style="
                left: {gradient.x}%;
                top: {gradient.y}%;
                background-color: {hslToRGB(gradient.color)};
            "
            onpointerdown={e => handlePointerDown(e, gradient.id)}>
            <span class="sr-only">Gradient {gradient.id}</span>
        </button>
    {/each}
</div>

<style lang="postcss">
    .canvas-container {
        @apply relative w-full rounded-lg overflow-hidden;
        aspect-ratio: 16 / 9;
        background-color: var(--bg-light);
        border: 1px solid theme(colors.zinc.300);
    }

    :global(.dark) .canvas-container {
        background-color: var(--bg-dark);
        border-color: theme(colors.zinc.600);
    }

    .grid-overlay {
        @apply absolute inset-0 pointer-events-none opacity-20;
        background-image:
            linear-gradient(
                to right,
                theme(colors.zinc.400) 1px,
                transparent 1px
            ),
            linear-gradient(
                to bottom,
                theme(colors.zinc.400) 1px,
                transparent 1px
            );
        background-size: 20% 20%;
    }

    .gradient-handle {
        @apply absolute w-4 h-4 rounded-full cursor-grab;
        @apply border-2 border-white shadow-md;
        transform: translate(-50%, -50%);
    }

    .gradient-handle.selected {
        @apply ring-2 ring-blue-500 ring-offset-1;
    }

    .gradient-handle.dragging {
        @apply cursor-grabbing scale-110;
    }

    :global(.dark) .gradient-handle {
        @apply border-zinc-800;
    }
</style>
