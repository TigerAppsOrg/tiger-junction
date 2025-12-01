<script lang="ts">
    import SidePanel from "$lib/components/ui/SidePanel.svelte";
    import { panelStore } from "$lib/stores/panel";
    import {
        darkTheme,
        calColors,
        DEFAULT_RCARD_COLORS,
        type CalColors
    } from "$lib/stores/styles";
    import { colorPalettes } from "$lib/scripts/ReCal+/palettes";
    import { rgbToHSL, hslToRGB } from "$lib/scripts/convert";

    $: open = $panelStore === "theme";

    // Spinning animation state for theme toggle
    let spinning = false;

    const toggleTheme = () => {
        spinning = true;
        darkTheme.set(!$darkTheme);
        setTimeout(() => {
            spinning = false;
        }, 500);
    };

    // Dark palettes that should auto-enable dark mode
    const DARK_PALETTES = new Set([
        "Midnight",
        "Cobalt",
        "Shadow",
        "Crimson",
        "Aurora",
        "Pixel"
    ]);

    const LAST_THEME_KEY = "recal-last-selected-theme";

    // Track the last selected theme for "Reset to Theme" functionality
    // Load from localStorage on init
    let lastSelectedTheme: { name: string; colors: CalColors } | null = null;

    // Load last selected theme from localStorage on mount
    if (typeof window !== "undefined") {
        const stored = localStorage.getItem(LAST_THEME_KEY);
        if (stored) {
            try {
                lastSelectedTheme = JSON.parse(stored);
            } catch {
                localStorage.removeItem(LAST_THEME_KEY);
            }
        }
    }

    /**
     * Apply a preset palette
     */
    const applyPalette = (name: string, colors: CalColors) => {
        const hslColors: CalColors = Object.entries(colors)
            .map(([key, value]) => [key, rgbToHSL(value)])
            .reduce(
                (acc, [key, value]) => ({ ...acc, [key]: value }),
                {}
            ) as CalColors;

        calColors.set(hslColors);
        lastSelectedTheme = { name, colors: hslColors };

        // Persist to localStorage
        if (typeof window !== "undefined") {
            localStorage.setItem(
                LAST_THEME_KEY,
                JSON.stringify(lastSelectedTheme)
            );
        }

        // Auto-toggle dark mode for dark palettes
        if (DARK_PALETTES.has(name)) {
            darkTheme.set(true);
        } else {
            darkTheme.set(false);
        }
    };

    /**
     * Update a single color (live)
     */
    const updateColor = (key: string, rgbValue: string) => {
        const hslValue = rgbToHSL(rgbValue);
        calColors.set({ ...$calColors, [key]: hslValue });
    };

    /**
     * Reset to last selected theme
     */
    const resetToTheme = () => {
        if (lastSelectedTheme) {
            calColors.set(lastSelectedTheme.colors);
        }
    };

    /**
     * Reset to app default colors
     */
    const resetToDefault = () => {
        calColors.set(DEFAULT_RCARD_COLORS);
        darkTheme.set(false);
        lastSelectedTheme = null;

        // Remove from localStorage
        if (typeof window !== "undefined") {
            localStorage.removeItem(LAST_THEME_KEY);
        }
    };

    /**
     * Get the display label for a color key
     */
    const getColorLabel = (key: string): string => {
        if (key === "-1") return "Preview";
        if (key === "E") return "Events";
        return String(parseInt(key) + 1);
    };

    // Sort palette colors for display: E first, then 0-6, then -1 last
    const sortPaletteColors = (colors: CalColors): string[] => {
        return Object.entries(colors)
            .sort(([a], [b]) => {
                if (a === "E") return -1;
                if (b === "E") return 1;
                if (a === "-1") return 1;
                if (b === "-1") return -1;
                return parseInt(a) - parseInt(b);
            })
            .map(([_, value]) => value);
    };
</script>

<SidePanel
    {open}
    title="Theme Settings"
    width="340px"
    on:close={() => panelStore.close()}>
    <div class="p-4 space-y-6">
        <!-- Dark Mode Toggle -->
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
                {#if $darkTheme}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="currentColor"
                        class="w-5 h-5 dark:text-zinc-100 {spinning
                            ? 'spin'
                            : ''}">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                    </svg>
                {:else}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="currentColor"
                        class="w-5 h-5 dark:text-zinc-100 {spinning
                            ? 'spin'
                            : ''}">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                    </svg>
                {/if}
                <span class="font-medium dark:text-zinc-100">Dark Mode</span>
            </div>
            <button
                on:click={toggleTheme}
                class="relative w-11 h-6 rounded-full transition-colors
                       {$darkTheme
                    ? 'bg-blue-600'
                    : 'bg-zinc-300 dark:bg-zinc-600'}">
                <span
                    class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow
                           transition-transform {$darkTheme
                        ? 'translate-x-5'
                        : 'translate-x-0'}" />
            </button>
        </div>

        <!-- Preset Themes -->
        <div>
            <h3
                class="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-3">
                Preset Themes
            </h3>
            <div class="grid grid-cols-2 gap-2">
                {#each Object.entries(colorPalettes) as [name, colors]}
                    <button
                        class="palette-card"
                        on:click={() => applyPalette(name, colors)}>
                        <div class="flex flex-col">
                            {#each sortPaletteColors(colors) as color}
                                <div
                                    class="h-3 w-full"
                                    style="background-color: {color}" />
                            {/each}
                        </div>
                        <span
                            class="text-xs font-medium py-1 dark:text-zinc-100">
                            {name}
                        </span>
                    </button>
                {/each}
            </div>
        </div>

        <!-- Custom Colors -->
        <div>
            <h3
                class="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                Custom Colors
            </h3>
            <div
                class="grid grid-cols-3 gap-2 p-3 rounded-lg bg-zinc-100/50 dark:bg-zinc-800/50">
                {#each Object.keys($calColors).sort((a, b) => {
                    if (a === "E") return 1;
                    if (b === "E") return 1;
                    if (a === "-1") return 1;
                    if (b === "-1") return -1;
                    return parseInt(a) - parseInt(b);
                }) as colorKey}
                    <label class="color-swatch" title={getColorLabel(colorKey)}>
                        <div class="color-input-wrapper">
                            <input
                                type="color"
                                value={hslToRGB($calColors[colorKey])}
                                on:input={e =>
                                    updateColor(
                                        colorKey,
                                        e.currentTarget.value
                                    )}
                                class="color-input" />
                            <div
                                class="color-display"
                                style="background-color: {hslToRGB(
                                    $calColors[colorKey]
                                )}" />
                        </div>
                        <span
                            class="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                            {getColorLabel(colorKey)}
                        </span>
                    </label>
                {/each}
            </div>
        </div>

        <!-- Reset Buttons -->
        <div class="flex gap-2">
            {#if lastSelectedTheme}
                <button
                    on:click={resetToTheme}
                    class="flex-1 py-2 px-3 rounded-lg text-sm font-medium
                           bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300
                           hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                    Reset to {lastSelectedTheme.name}
                </button>
            {/if}
            <button
                on:click={resetToDefault}
                class="flex-1 py-2 px-3 rounded-lg text-sm font-medium
                       bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300
                       hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                Reset to Default
            </button>
        </div>
    </div>
</SidePanel>

<style lang="postcss">
    .palette-card {
        @apply rounded-lg overflow-hidden border-2
               border-zinc-200 dark:border-zinc-700
               hover:border-zinc-400 dark:hover:border-zinc-500
               transition-colors cursor-pointer;
    }

    .color-swatch {
        @apply flex flex-col items-center gap-0.5 cursor-pointer;
    }

    .color-input-wrapper {
        @apply relative w-10 h-10;
    }

    .color-input {
        @apply absolute inset-0 w-full h-full opacity-0 cursor-pointer;
    }

    .color-display {
        @apply w-10 h-10 rounded-md shadow-sm
               border border-zinc-400/50
               transition-all pointer-events-none;
    }

    .color-swatch:hover .color-display {
        @apply scale-105 border-zinc-500;
    }

    .spin {
        animation: spin 0.5s ease-in-out;
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
</style>
