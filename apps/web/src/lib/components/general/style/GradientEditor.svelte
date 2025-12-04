<script lang="ts">
    import type { GradientConfig, GradientShape } from "$lib/stores/styles";
    import { hslToRGB, rgbToHSL } from "$lib/scripts/convert";

    let {
        gradient,
        onupdate,
        ondelete
    }: {
        gradient: GradientConfig;
        onupdate?: (config: GradientConfig) => void;
        ondelete?: (detail: { id: string }) => void;
    } = $props();

    function updateField<K extends keyof GradientConfig>(
        key: K,
        value: GradientConfig[K]
    ) {
        onupdate?.({ ...gradient, [key]: value });
    }

    function handleColorChange(e: Event) {
        const target = e.target as HTMLInputElement;
        const hslValue = rgbToHSL(target.value);
        updateField("color", hslValue);
    }

    function handleDelete() {
        ondelete?.({ id: gradient.id });
    }
</script>

<div class="editor-container">
    <div class="editor-header">
        <span class="editor-title">Edit Gradient</span>
        <button
            type="button"
            class="delete-btn"
            onclick={handleDelete}
            title="Delete gradient">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="w-4 h-4">
                <path
                    fill-rule="evenodd"
                    d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                    clip-rule="evenodd" />
            </svg>
        </button>
    </div>

    <!-- Color -->
    <div class="field-row">
        <span class="field-label">Color</span>
        <label class="color-input-wrapper">
            <input
                type="color"
                value={hslToRGB(gradient.color)}
                oninput={handleColorChange}
                class="color-input" />
            <div
                class="color-display"
                style="background-color: {hslToRGB(gradient.color)}">
            </div>
        </label>
    </div>

    <!-- Position X -->
    <div class="field-row">
        <span class="field-label">Position X</span>
        <label class="slider-wrapper">
            <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={gradient.x}
                oninput={e => updateField("x", Number(e.currentTarget.value))}
                class="slider" />
            <span class="slider-value">{Math.round(gradient.x)}%</span>
        </label>
    </div>

    <!-- Position Y -->
    <div class="field-row">
        <span class="field-label">Position Y</span>
        <label class="slider-wrapper">
            <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={gradient.y}
                oninput={e => updateField("y", Number(e.currentTarget.value))}
                class="slider" />
            <span class="slider-value">{Math.round(gradient.y)}%</span>
        </label>
    </div>

    <!-- Size -->
    <div class="field-row">
        <span class="field-label">Size</span>
        <label class="slider-wrapper">
            <input
                type="range"
                min="10"
                max="100"
                step="1"
                value={gradient.size}
                oninput={e =>
                    updateField("size", Number(e.currentTarget.value))}
                class="slider" />
            <span class="slider-value">{Math.round(gradient.size)}%</span>
        </label>
    </div>

    <!-- Opacity -->
    <div class="field-row">
        <span class="field-label">Opacity</span>
        <label class="slider-wrapper">
            <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={gradient.opacity}
                oninput={e =>
                    updateField("opacity", Number(e.currentTarget.value))}
                class="slider" />
            <span class="slider-value"
                >{Math.round(gradient.opacity * 100)}%</span>
        </label>
    </div>

    <!-- Blur -->
    <div class="field-row">
        <span class="field-label">Blur</span>
        <label class="slider-wrapper">
            <input
                type="range"
                min="10"
                max="100"
                step="1"
                value={gradient.blur}
                oninput={e =>
                    updateField("blur", Number(e.currentTarget.value))}
                class="slider" />
            <span class="slider-value">{Math.round(gradient.blur)}%</span>
        </label>
    </div>

    <!-- Shape -->
    <div class="field-row">
        <span class="field-label">Shape</span>
        <div class="shape-toggle">
            <button
                type="button"
                class="shape-btn"
                class:active={gradient.shape === "ellipse"}
                onclick={() => updateField("shape", "ellipse")}>
                Ellipse
            </button>
            <button
                type="button"
                class="shape-btn"
                class:active={gradient.shape === "circle"}
                onclick={() => updateField("shape", "circle")}>
                Circle
            </button>
        </div>
    </div>
</div>

<style lang="postcss">
    .editor-container {
        @apply mt-3 pt-3 space-y-2;
        @apply border-t border-zinc-200 dark:border-zinc-700;
    }

    .editor-header {
        @apply flex items-center justify-between mb-2;
    }

    .editor-title {
        @apply text-xs font-medium text-zinc-600 dark:text-zinc-400;
    }

    .delete-btn {
        @apply p-1 rounded text-zinc-400 hover:text-red-500;
        @apply hover:bg-red-50 dark:hover:bg-red-900/20;
        @apply transition-colors;
    }

    .field-row {
        @apply flex items-center gap-2;
    }

    .field-label {
        @apply text-[10px] text-zinc-500 dark:text-zinc-400 w-16 shrink-0;
    }

    .color-input-wrapper {
        @apply relative flex-1 h-6;
    }

    .color-input {
        @apply absolute inset-0 w-full h-full opacity-0 cursor-pointer;
    }

    .color-display {
        @apply w-full h-full rounded border border-zinc-300 dark:border-zinc-600;
        @apply pointer-events-none;
    }

    .slider-wrapper {
        @apply flex items-center gap-2 flex-1;
    }

    .slider {
        @apply flex-1 h-1.5 rounded-full appearance-none cursor-pointer;
        @apply bg-zinc-300 dark:bg-zinc-600;
    }

    .slider::-webkit-slider-thumb {
        @apply appearance-none w-3 h-3 rounded-full bg-blue-600 cursor-pointer;
    }

    .slider::-moz-range-thumb {
        @apply w-3 h-3 rounded-full border-0 bg-blue-600 cursor-pointer;
    }

    .slider-value {
        @apply text-[10px] text-zinc-500 dark:text-zinc-400 w-8 text-right;
    }

    .shape-toggle {
        @apply flex gap-1 flex-1;
    }

    .shape-btn {
        @apply flex-1 py-1 px-2 text-[10px] rounded;
        @apply bg-zinc-100 dark:bg-zinc-700;
        @apply text-zinc-600 dark:text-zinc-400;
        @apply transition-colors;
    }

    .shape-btn.active {
        @apply bg-blue-600 text-white;
    }
</style>
