<script lang="ts">
    import SidePanel from "$lib/components/ui/SidePanel.svelte";
    import { panelStore } from "$lib/stores/panel";
    import {
        darkTheme,
        calColors,
        DEFAULT_RCARD_COLORS,
        bgColors,
        DEFAULT_BG_COLORS,
        bgEffects,
        DEFAULT_BG_EFFECTS,
        appFont,
        FONT_OPTIONS,
        DEFAULT_FONT,
        type CalColors,
        type BgColors,
        type BackgroundEffects
    } from "$lib/stores/styles";
    import { colorPalettes, type Palette } from "$lib/scripts/ReCal+/palettes";
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
    let lastSelectedTheme: {
        name: string;
        colors: CalColors;
        bgColors: BgColors;
    } | null = null;

    // Load last selected theme from localStorage on mount
    if (typeof window !== "undefined") {
        const stored = localStorage.getItem(LAST_THEME_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Handle migration from old format without bgColors
                if (parsed.bgColors) {
                    lastSelectedTheme = parsed;
                } else if (parsed.name && colorPalettes[parsed.name]) {
                    // Reconstruct bgColors from palette
                    const palette = colorPalettes[parsed.name];
                    lastSelectedTheme = {
                        ...parsed,
                        bgColors: {
                            light: rgbToHSL(palette.bgLight),
                            dark: rgbToHSL(palette.bgDark)
                        }
                    };
                    localStorage.setItem(
                        LAST_THEME_KEY,
                        JSON.stringify(lastSelectedTheme)
                    );
                } else {
                    lastSelectedTheme = parsed;
                }
            } catch {
                localStorage.removeItem(LAST_THEME_KEY);
            }
        }
    }

    /**
     * Apply a preset palette
     */
    const applyPalette = (name: string, palette: Palette) => {
        const hslColors: CalColors = Object.entries(palette.colors)
            .map(([key, value]) => [key, rgbToHSL(value)])
            .reduce(
                (acc, [key, value]) => ({ ...acc, [key]: value }),
                {}
            ) as CalColors;

        calColors.set(hslColors);

        // Apply background colors from palette
        const themeBgColors: BgColors = {
            light: rgbToHSL(palette.bgLight),
            dark: rgbToHSL(palette.bgDark)
        };
        bgColors.set(themeBgColors);

        // Store theme with both colors and bgColors
        lastSelectedTheme = {
            name,
            colors: hslColors,
            bgColors: themeBgColors
        };

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
     * Reset to last selected theme (both colors and background)
     */
    const resetToTheme = () => {
        if (lastSelectedTheme) {
            calColors.set(lastSelectedTheme.colors);
            if (lastSelectedTheme.bgColors) {
                bgColors.set(lastSelectedTheme.bgColors);
            }
        }
    };

    /**
     * Reset background colors to last selected theme
     */
    const resetBgToTheme = () => {
        if (lastSelectedTheme?.bgColors) {
            bgColors.set(lastSelectedTheme.bgColors);
        }
    };

    /**
     * Reset to app default colors
     */
    const resetToDefault = () => {
        calColors.set(DEFAULT_RCARD_COLORS);
        bgColors.set(DEFAULT_BG_COLORS);
        bgEffects.set(DEFAULT_BG_EFFECTS);
        appFont.set(DEFAULT_FONT);
        darkTheme.set(false);
        lastSelectedTheme = null;
        effectsExpanded = false;

        // Remove from localStorage
        if (typeof window !== "undefined") {
            localStorage.removeItem(LAST_THEME_KEY);
        }
    };

    /**
     * Update background color
     */
    const updateBgColor = (mode: "light" | "dark", rgbValue: string) => {
        const hslValue = rgbToHSL(rgbValue);
        bgColors.set({ ...$bgColors, [mode]: hslValue });
    };

    /**
     * Reset background colors to default
     */
    const resetBgColors = () => {
        bgColors.set(DEFAULT_BG_COLORS);
    };

    /**
     * Reset effects to default
     */
    const resetEffects = () => {
        bgEffects.set(DEFAULT_BG_EFFECTS);
    };

    /**
     * Update noise settings
     */
    const updateNoise = (key: keyof BackgroundEffects["noise"], value: any) => {
        bgEffects.set({
            ...$bgEffects,
            noise: { ...$bgEffects.noise, [key]: value }
        });
    };

    /**
     * Update glow settings
     */
    const updateGlow = (key: keyof BackgroundEffects["glows"], value: any) => {
        bgEffects.set({
            ...$bgEffects,
            glows: { ...$bgEffects.glows, [key]: value }
        });
    };

    /**
     * Update glow color (convert from RGB to HSL)
     */
    const updateGlowColor = (colorNum: 1 | 2, rgbValue: string) => {
        const hslValue = rgbToHSL(rgbValue);
        const key = colorNum === 1 ? "color1" : "color2";
        updateGlow(key, hslValue);
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
    const sortPaletteColors = (palette: Palette): string[] => {
        return Object.entries(palette.colors)
            .sort(([a], [b]) => {
                if (a === "E") return -1;
                if (b === "E") return 1;
                if (a === "-1") return 1;
                if (b === "-1") return -1;
                return parseInt(a) - parseInt(b);
            })
            .map(([_, value]) => value);
    };

    // State for collapsible sections - auto-expand if any effects are enabled
    let effectsExpanded = $bgEffects.noise.enabled || $bgEffects.glows.enabled;
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

        <!-- Font Selector -->
        <div>
            <h3
                class="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                Typography
            </h3>
            <div class="grid grid-cols-3 gap-2">
                {#each FONT_OPTIONS as font}
                    <button
                        on:click={() => appFont.set(font.name)}
                        class="font-button {$appFont === font.name
                            ? 'ring-2 ring-blue-500 border-blue-500'
                            : 'border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500'}">
                        <span
                            class="text-2xl dark:text-zinc-100"
                            style="font-family: '{font.name}', {font.fallback}">
                            Aa
                        </span>
                        <span
                            class="text-[10px] text-zinc-500 dark:text-zinc-400 truncate w-full text-center">
                            {font.name}
                        </span>
                    </button>
                {/each}
            </div>
        </div>

        <!-- Preset Themes -->
        <div>
            <h3
                class="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-3">
                Themes
            </h3>
            <div class="grid grid-cols-2 gap-2">
                {#each Object.entries(colorPalettes) as [name, palette]}
                    <button
                        class="palette-card"
                        on:click={() => applyPalette(name, palette)}>
                        <div class="flex flex-col">
                            {#each sortPaletteColors(palette) as color}
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

        <!-- Background Colors -->
        <div>
            <h3
                class="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                Background Colors
            </h3>
            <div
                class="flex gap-4 p-3 rounded-lg bg-zinc-100/50 dark:bg-zinc-800/50">
                <label
                    class="color-swatch flex-1"
                    title="Light Mode Background">
                    <div class="color-input-wrapper w-full">
                        <input
                            type="color"
                            value={hslToRGB($bgColors.light)}
                            on:input={e =>
                                updateBgColor("light", e.currentTarget.value)}
                            class="color-input" />
                        <div
                            class="color-display w-full"
                            style="background-color: {hslToRGB(
                                $bgColors.light
                            )}" />
                    </div>
                    <span
                        class="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                        Light Mode
                    </span>
                </label>
                <label class="color-swatch flex-1" title="Dark Mode Background">
                    <div class="color-input-wrapper w-full">
                        <input
                            type="color"
                            value={hslToRGB($bgColors.dark)}
                            on:input={e =>
                                updateBgColor("dark", e.currentTarget.value)}
                            class="color-input" />
                        <div
                            class="color-display w-full"
                            style="background-color: {hslToRGB(
                                $bgColors.dark
                            )}" />
                    </div>
                    <span
                        class="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                        Dark Mode
                    </span>
                </label>
            </div>
            <div class="flex gap-2 mt-2">
                {#if lastSelectedTheme?.bgColors}
                    <button
                        on:click={resetBgToTheme}
                        class="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium
                               bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400
                               hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                        Reset to {lastSelectedTheme.name}
                    </button>
                {/if}
                <button
                    on:click={resetBgColors}
                    class="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium
                           bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400
                           hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                    Reset to Default
                </button>
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

        <!-- Background Effects (Collapsible) -->
        <div class="border-t border-zinc-200 dark:border-zinc-700 pt-4">
            <button
                on:click={() => (effectsExpanded = !effectsExpanded)}
                class="flex items-center justify-between w-full text-left">
                <h3
                    class="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                    Advanced Background Effects
                </h3>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="w-4 h-4 text-zinc-500 transition-transform {effectsExpanded
                        ? 'rotate-180'
                        : ''}">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
            </button>

            {#if effectsExpanded}
                <div class="mt-3 space-y-4">
                    <!-- Noise Settings -->
                    <div
                        class="p-3 rounded-lg bg-zinc-100/50 dark:bg-zinc-800/50">
                        <div class="flex items-center justify-between mb-3">
                            <span
                                class="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                Noise Texture
                            </span>
                            <button
                                on:click={() =>
                                    updateNoise(
                                        "enabled",
                                        !$bgEffects.noise.enabled
                                    )}
                                class="relative w-9 h-5 rounded-full transition-colors
                                       {$bgEffects.noise.enabled
                                    ? 'bg-blue-600'
                                    : 'bg-zinc-300 dark:bg-zinc-600'}">
                                <span
                                    class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow
                                           transition-transform {$bgEffects
                                        .noise.enabled
                                        ? 'translate-x-4'
                                        : 'translate-x-0'}" />
                            </button>
                        </div>

                        {#if $bgEffects.noise.enabled}
                            <div class="space-y-2">
                                <div>
                                    <span
                                        class="text-[10px] text-zinc-500 dark:text-zinc-400">
                                        Opacity: {Math.round(
                                            $bgEffects.noise.opacity * 100
                                        )}%
                                    </span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={$bgEffects.noise.opacity}
                                        on:input={e =>
                                            updateNoise(
                                                "opacity",
                                                parseFloat(
                                                    e.currentTarget.value
                                                )
                                            )}
                                        class="slider" />
                                </div>
                                <div>
                                    <span
                                        class="text-[10px] text-zinc-500 dark:text-zinc-400">
                                        Grain Size: {$bgEffects.noise.baseFrequency.toFixed(
                                            1
                                        )}
                                    </span>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="3"
                                        step="0.1"
                                        value={$bgEffects.noise.baseFrequency}
                                        on:input={e =>
                                            updateNoise(
                                                "baseFrequency",
                                                parseFloat(
                                                    e.currentTarget.value
                                                )
                                            )}
                                        class="slider" />
                                </div>
                            </div>
                        {/if}
                    </div>

                    <!-- Glow Settings -->
                    <div
                        class="p-3 rounded-lg bg-zinc-100/50 dark:bg-zinc-800/50">
                        <div class="flex items-center justify-between mb-3">
                            <span
                                class="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                Gradient Glows
                            </span>
                            <button
                                on:click={() =>
                                    updateGlow(
                                        "enabled",
                                        !$bgEffects.glows.enabled
                                    )}
                                class="relative w-9 h-5 rounded-full transition-colors
                                       {$bgEffects.glows.enabled
                                    ? 'bg-blue-600'
                                    : 'bg-zinc-300 dark:bg-zinc-600'}">
                                <span
                                    class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow
                                           transition-transform {$bgEffects
                                        .glows.enabled
                                        ? 'translate-x-4'
                                        : 'translate-x-0'}" />
                            </button>
                        </div>

                        {#if $bgEffects.glows.enabled}
                            <div class="space-y-3">
                                <div class="flex gap-3">
                                    <label
                                        class="color-swatch flex-1"
                                        title="Glow Color 1">
                                        <div class="color-input-wrapper w-full">
                                            <input
                                                type="color"
                                                value={hslToRGB(
                                                    $bgEffects.glows.color1
                                                )}
                                                on:input={e =>
                                                    updateGlowColor(
                                                        1,
                                                        e.currentTarget.value
                                                    )}
                                                class="color-input" />
                                            <div
                                                class="color-display w-full h-8"
                                                style="background-color: {hslToRGB(
                                                    $bgEffects.glows.color1
                                                )}" />
                                        </div>
                                        <span
                                            class="text-[10px] text-zinc-500 dark:text-zinc-400">
                                            Color 1
                                        </span>
                                    </label>
                                    <label
                                        class="color-swatch flex-1"
                                        title="Glow Color 2">
                                        <div class="color-input-wrapper w-full">
                                            <input
                                                type="color"
                                                value={hslToRGB(
                                                    $bgEffects.glows.color2
                                                )}
                                                on:input={e =>
                                                    updateGlowColor(
                                                        2,
                                                        e.currentTarget.value
                                                    )}
                                                class="color-input" />
                                            <div
                                                class="color-display w-full h-8"
                                                style="background-color: {hslToRGB(
                                                    $bgEffects.glows.color2
                                                )}" />
                                        </div>
                                        <span
                                            class="text-[10px] text-zinc-500 dark:text-zinc-400">
                                            Color 2
                                        </span>
                                    </label>
                                </div>
                                <div>
                                    <span
                                        class="text-[10px] text-zinc-500 dark:text-zinc-400">
                                        Intensity: {Math.round(
                                            $bgEffects.glows.opacity * 100
                                        )}%
                                    </span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="0.5"
                                        step="0.02"
                                        value={$bgEffects.glows.opacity}
                                        on:input={e =>
                                            updateGlow(
                                                "opacity",
                                                parseFloat(
                                                    e.currentTarget.value
                                                )
                                            )}
                                        class="slider" />
                                </div>
                            </div>
                        {/if}
                    </div>

                    <button
                        on:click={resetEffects}
                        class="w-full py-1.5 px-3 rounded-lg text-xs font-medium
                               bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400
                               hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                        Reset Effects
                    </button>
                </div>
            {/if}
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

    .font-button {
        @apply flex flex-col items-center justify-center
               p-2 rounded-lg border-2
               bg-zinc-50 dark:bg-zinc-800/50
               transition-all cursor-pointer;
        aspect-ratio: 1;
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

    .slider {
        @apply w-full h-1.5 rounded-full appearance-none cursor-pointer
               bg-zinc-300 dark:bg-zinc-600;
    }

    .slider::-webkit-slider-thumb {
        @apply appearance-none w-3.5 h-3.5 rounded-full
               bg-blue-600 cursor-pointer;
    }

    .slider::-moz-range-thumb {
        @apply w-3.5 h-3.5 rounded-full border-0
               bg-blue-600 cursor-pointer;
    }
</style>
