<script lang="ts">
    import type { GradientConfig } from "$lib/stores/styles";
    import { MAX_GRADIENTS } from "$lib/stores/styles";
    import { hslToRGB } from "$lib/scripts/convert";

    let {
        gradients = [],
        selectedId = null,
        onselect,
        onadd
    }: {
        gradients?: GradientConfig[];
        selectedId?: string | null;
        onselect?: (detail: { id: string }) => void;
        onadd?: () => void;
    } = $props();

    function handleSelect(id: string) {
        onselect?.({ id });
    }

    function handleAdd() {
        onadd?.();
    }

    let canAdd = $derived(gradients.length < MAX_GRADIENTS);
</script>

<div class="list-container">
    <div class="list-header">
        <span class="list-title">Gradients</span>
        <span class="list-count">{gradients.length}/{MAX_GRADIENTS}</span>
    </div>

    <div class="gradient-items">
        {#each gradients as gradient, index (gradient.id)}
            <button
                type="button"
                class="gradient-item"
                class:selected={gradient.id === selectedId}
                onclick={() => handleSelect(gradient.id)}>
                <div
                    class="gradient-swatch"
                    style="background-color: {hslToRGB(gradient.color)}">
                </div>
                <span class="gradient-index">{index + 1}</span>
            </button>
        {/each}

        {#if canAdd}
            <button type="button" class="add-btn" onclick={handleAdd}>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    class="w-4 h-4">
                    <path
                        d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
            </button>
        {/if}
    </div>
</div>

<style lang="postcss">
    .list-container {
        @apply mt-3;
    }

    .list-header {
        @apply flex items-center justify-between mb-2;
    }

    .list-title {
        @apply text-[10px] font-medium text-zinc-500;
    }

    :global(.dark) .list-title {
        @apply text-zinc-400;
    }

    .list-count {
        @apply text-[10px] text-zinc-400;
    }

    :global(.dark) .list-count {
        @apply text-zinc-500;
    }

    .gradient-items {
        @apply flex flex-wrap gap-1.5;
    }

    .gradient-item {
        @apply relative w-8 h-8 rounded-lg overflow-hidden;
        @apply border border-zinc-300;
        @apply transition-all duration-100;
    }

    :global(.dark) .gradient-item {
        @apply border-zinc-600;
    }

    .gradient-item:hover {
        @apply scale-110;
    }

    .gradient-item.selected {
        @apply ring-2 ring-blue-500 ring-offset-1;
    }

    :global(.dark) .gradient-item.selected {
        @apply ring-offset-zinc-800;
    }

    .gradient-swatch {
        @apply absolute inset-0;
    }

    .gradient-index {
        @apply absolute bottom-0 right-0 px-1;
        @apply text-[8px] font-bold text-white;
        @apply bg-black/40 rounded-tl;
    }

    .add-btn {
        @apply w-8 h-8 rounded-lg;
        @apply border border-dashed border-zinc-300;
        @apply flex items-center justify-center;
        @apply text-zinc-400;
        @apply hover:border-blue-500 hover:text-blue-500;
        @apply transition-colors;
    }

    :global(.dark) .add-btn {
        @apply border-zinc-600;
        @apply text-zinc-500;
    }
</style>
