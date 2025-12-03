<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { GradientConfig } from "$lib/stores/styles";
    import { hslToRGB, hslToRGBComponents } from "$lib/scripts/convert";

    export let gradients: GradientConfig[] = [];
    export let selectedId: string | null = null;
    export let globalOpacity: number = 0.15;

    const dispatch = createEventDispatcher<{
        select: { id: string };
        move: { id: string; x: number; y: number };
    }>();

    let canvasEl: HTMLElement;
    let isDragging = false;
    let draggedGradientId: string | null = null;
    let justFinishedDragging = false;

    // Generate preview gradient CSS
    $: previewCSS =
        gradients.length > 0
            ? gradients
                  .map(g => {
                      const rgb = hslToRGBComponents(g.color);
                      const scaledBlur = (g.size / 100) * g.blur;
                      return `radial-gradient(${g.shape} at ${g.x}% ${g.y}%, rgba(${rgb}, ${globalOpacity * g.opacity}) 0%, transparent ${scaledBlur}%)`;
                  })
                  .join(", ")
            : "none";

    function handlePointerDown(e: PointerEvent, gradientId: string) {
        e.stopPropagation();
        isDragging = true;
        draggedGradientId = gradientId;
        dispatch("select", { id: gradientId });

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

        dispatch("move", { id: draggedGradientId, x, y });
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
            dispatch("select", { id: "" });
        }
    }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
    bind:this={canvasEl}
    class="canvas-container"
    style="background: {previewCSS};"
    on:click={handleCanvasClick}>
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
            on:pointerdown={e => handlePointerDown(e, gradient.id)}>
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
