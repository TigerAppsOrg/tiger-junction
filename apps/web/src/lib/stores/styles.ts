import { darkenHSL, rgbToHSL } from "$lib/scripts/convert";
import { colorPalettes } from "$lib/scripts/ReCal+/palettes";
import { get, writable } from "svelte/store";

//----------------------------------------------------------------------
// Background Colors
//----------------------------------------------------------------------

export type BgColors = {
    light: string; // HSL string
    dark: string; // HSL string
};

export const DEFAULT_BG_COLORS: BgColors = {
    light: "hsl(0, 0%, 100%)", // white
    dark: "hsl(240, 6%, 10%)" // zinc-900
};

const initializeBgColors = (): BgColors => {
    if (typeof window === "undefined") return DEFAULT_BG_COLORS;

    const stored = localStorage.getItem("bgColors");
    if (!stored) {
        localStorage.setItem("bgColors", JSON.stringify(DEFAULT_BG_COLORS));
        return DEFAULT_BG_COLORS;
    }

    try {
        const parsed = JSON.parse(stored);
        if (parsed.light && parsed.dark) {
            return parsed;
        }
    } catch {
        // Invalid JSON, reset to defaults
    }

    localStorage.setItem("bgColors", JSON.stringify(DEFAULT_BG_COLORS));
    return DEFAULT_BG_COLORS;
};

const {
    subscribe: bgSubscribe,
    update: bgUpdate,
    set: bgSet
} = writable<BgColors>(initializeBgColors());

export const bgColors = {
    subscribe: bgSubscribe,
    update: bgUpdate,
    set: (value: BgColors) => {
        bgSet(value);
        localStorage.setItem("bgColors", JSON.stringify(value));
    }
};

//----------------------------------------------------------------------
// Background Effects (Noise + Glows)
//----------------------------------------------------------------------

export type GradientShape = "circle" | "ellipse";

export type GradientConfig = {
    id: string;
    color: string; // HSL string
    x: number; // Position X (0-100%)
    y: number; // Position Y (0-100%)
    size: number; // Radius (10-100%)
    opacity: number; // Individual opacity (0-1)
    shape: GradientShape;
    blur: number; // Fade amount (10-100%)
};

export type GlowsConfig = {
    enabled: boolean;
    gradients: GradientConfig[];
    globalOpacity: number; // Master opacity (0-1)
    darkModeIntensity: number; // Dark mode multiplier
};

export type BackgroundEffects = {
    noise: {
        enabled: boolean;
        opacity: number; // 0-1
        baseFrequency: number; // default 1.5
    };
    glows: GlowsConfig;
};

export const MAX_GRADIENTS = 10;

export const generateGradientId = (): string => {
    return `grad_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const createGradient = (
    overrides?: Partial<GradientConfig>
): GradientConfig => {
    return {
        id: generateGradientId(),
        color: "hsl(36, 100%, 50%)",
        x: 50,
        y: 50,
        size: 30,
        opacity: 1,
        shape: "ellipse",
        blur: 30,
        ...overrides
    };
};

export const DEFAULT_GRADIENTS: GradientConfig[] = [
    {
        id: "default_1",
        color: "hsl(36, 100%, 50%)", // orange
        x: 0,
        y: 15,
        size: 30,
        opacity: 1,
        shape: "ellipse",
        blur: 30
    },
    {
        id: "default_2",
        color: "hsl(211, 100%, 50%)", // blue
        x: 100,
        y: 30,
        size: 40,
        opacity: 1,
        shape: "ellipse",
        blur: 40
    }
];

export const DEFAULT_BG_EFFECTS: BackgroundEffects = {
    noise: {
        enabled: false,
        opacity: 0.5,
        baseFrequency: 1.5
    },
    glows: {
        enabled: false,
        gradients: [...DEFAULT_GRADIENTS],
        globalOpacity: 0.15,
        darkModeIntensity: 1.33
    }
};

const initializeBgEffects = (): BackgroundEffects => {
    if (typeof window === "undefined") return DEFAULT_BG_EFFECTS;

    const stored = localStorage.getItem("bgEffects");
    if (!stored) {
        localStorage.setItem("bgEffects", JSON.stringify(DEFAULT_BG_EFFECTS));
        return DEFAULT_BG_EFFECTS;
    }

    try {
        const parsed = JSON.parse(stored);
        // Validate structure
        if (parsed.noise && parsed.glows) {
            // Check if old format (has color1/color2 instead of gradients array)
            if (!Array.isArray(parsed.glows.gradients) && parsed.glows.color1) {
                // Migrate old format to new format
                const migratedGradients: GradientConfig[] = [
                    {
                        id: "migrated_1",
                        color: parsed.glows.color1 ?? "hsl(36, 100%, 50%)",
                        x: 0,
                        y: 15,
                        size: 30,
                        opacity: 1,
                        shape: "ellipse",
                        blur: 30
                    },
                    {
                        id: "migrated_2",
                        color: parsed.glows.color2 ?? "hsl(211, 100%, 50%)",
                        x: 100,
                        y: 30,
                        size: 40,
                        opacity: 1,
                        shape: "ellipse",
                        blur: 40
                    }
                ];

                const migrated: BackgroundEffects = {
                    noise: {
                        enabled:
                            parsed.noise.enabled ??
                            DEFAULT_BG_EFFECTS.noise.enabled,
                        opacity:
                            parsed.noise.opacity ??
                            DEFAULT_BG_EFFECTS.noise.opacity,
                        baseFrequency:
                            parsed.noise.baseFrequency ??
                            DEFAULT_BG_EFFECTS.noise.baseFrequency
                    },
                    glows: {
                        enabled:
                            parsed.glows.enabled ??
                            DEFAULT_BG_EFFECTS.glows.enabled,
                        gradients: migratedGradients,
                        globalOpacity:
                            parsed.glows.opacity ??
                            DEFAULT_BG_EFFECTS.glows.globalOpacity,
                        darkModeIntensity:
                            DEFAULT_BG_EFFECTS.glows.darkModeIntensity
                    }
                };
                localStorage.setItem("bgEffects", JSON.stringify(migrated));
                return migrated;
            }

            // New format - validate and return
            return {
                noise: {
                    enabled:
                        parsed.noise.enabled ??
                        DEFAULT_BG_EFFECTS.noise.enabled,
                    opacity:
                        parsed.noise.opacity ??
                        DEFAULT_BG_EFFECTS.noise.opacity,
                    baseFrequency:
                        parsed.noise.baseFrequency ??
                        DEFAULT_BG_EFFECTS.noise.baseFrequency
                },
                glows: {
                    enabled:
                        parsed.glows.enabled ??
                        DEFAULT_BG_EFFECTS.glows.enabled,
                    gradients:
                        parsed.glows.gradients ??
                        DEFAULT_BG_EFFECTS.glows.gradients,
                    globalOpacity:
                        parsed.glows.globalOpacity ??
                        DEFAULT_BG_EFFECTS.glows.globalOpacity,
                    darkModeIntensity:
                        parsed.glows.darkModeIntensity ??
                        DEFAULT_BG_EFFECTS.glows.darkModeIntensity
                }
            };
        }
    } catch {
        // Invalid JSON, reset to defaults
    }

    localStorage.setItem("bgEffects", JSON.stringify(DEFAULT_BG_EFFECTS));
    return DEFAULT_BG_EFFECTS;
};

const {
    subscribe: effectsSubscribe,
    update: effectsUpdate,
    set: effectsSet
} = writable<BackgroundEffects>(initializeBgEffects());

export const bgEffects = {
    subscribe: effectsSubscribe,
    update: effectsUpdate,
    set: (value: BackgroundEffects) => {
        effectsSet(value);
        localStorage.setItem("bgEffects", JSON.stringify(value));
    }
};

//----------------------------------------------------------------------
// Font
//----------------------------------------------------------------------

export type FontFamily =
    | "Lato"
    | "Roboto"
    | "Playfair Display"
    | "JetBrains Mono";

export const FONT_OPTIONS: { name: FontFamily; fallback: string }[] = [
    { name: "Lato", fallback: "sans-serif" },
    { name: "Roboto", fallback: "sans-serif" },
    { name: "Playfair Display", fallback: "serif" },
    { name: "JetBrains Mono", fallback: "monospace" }
];

export const DEFAULT_FONT: FontFamily = "Lato";

function createFontStore() {
    const store = writable<FontFamily>(
        typeof window !== "undefined"
            ? (localStorage.getItem("appFont") as FontFamily) || DEFAULT_FONT
            : DEFAULT_FONT
    );

    return {
        subscribe: store.subscribe,
        set: (value: FontFamily) => {
            store.set(value);
            localStorage.setItem("appFont", value);
        }
    };
}

export const appFont = createFontStore();

//----------------------------------------------------------------------
// General
//----------------------------------------------------------------------

function createDarkTheme() {
    const store = writable<boolean>(
        typeof window !== "undefined" &&
            localStorage.getItem("darkMode") === "true"
    );

    return {
        subscribe: store.subscribe,
        update: store.update,
        set: (value: boolean) => {
            store.set(value);
            localStorage.setItem("darkMode", value.toString());
        }
    };
}

export const darkTheme = createDarkTheme();

// Whether the user is on a mobile device (TODO - change to more responsive design)
export const isMobile = writable<boolean>(false);

// Whether to show the calendar on the mobile
export const showCal = writable<boolean>(true);

//----------------------------------------------------------------------
// ReCal+
//----------------------------------------------------------------------

export const isEventOpen = writable<boolean>(false);

// Resize ratio for left panel sections (0.0 to 1.0)
// Represents the fraction of available space given to the top section (Events + Saved)
// null means "auto" - use content-based default
function createSectionRatio() {
    const store = writable<number | null>(
        typeof window !== "undefined"
            ? JSON.parse(localStorage.getItem("sectionRatio") ?? "null")
            : null
    );

    return {
        subscribe: store.subscribe,
        update: store.update,
        set: (value: number | null) => {
            store.set(value);
            if (value === null) {
                localStorage.removeItem("sectionRatio");
            } else {
                localStorage.setItem("sectionRatio", JSON.stringify(value));
            }
        },
        reset: () => {
            store.set(null);
            localStorage.removeItem("sectionRatio");
        }
    };
}

export const sectionRatio = createSectionRatio();

export type CalColors = {
    "-1": string;
    "0": string;
    "1": string;
    "2": string;
    "3": string;
    "4": string;
    "5": string;
    "6": string;
    "E": string; // Event Color
};

export const DEFAULT_RCARD_COLORS: CalColors = {
    "-1": "hsl(0, 0%, 66%)",
    0: "hsl(120, 52%, 75%)",
    1: "hsl(35, 99%, 65%)",
    2: "hsl(197, 34%, 72%)",
    3: "hsl(60, 95%, 74%)",
    4: "hsl(1, 100%, 69%)",
    5: "hsl(330, 100%, 80%)",
    6: "hsl(305, 33%, 70%)",
    "E": "hsl(210, 35%, 91%)"
};

/**
 * Initializes the color scheme for the calendar, pulling from local storage if available
 * Since "E" was added later, this function also checks for the presence of "E" in the stored colors
 * If "E" is not present, it will attempt to find a matching color scheme and add "E" to it
 * If no matching color scheme is found, it will default to gray
 * @returns the color scheme for the calendar
 */
const initializeCalColors = (): CalColors => {
    if (typeof window === "undefined") return DEFAULT_RCARD_COLORS;

    const storedColors = localStorage.getItem("calColors");
    if (!storedColors) {
        localStorage.setItem("calColors", JSON.stringify(DEFAULT_RCARD_COLORS));
        return DEFAULT_RCARD_COLORS;
    }

    const parsedColors = JSON.parse(storedColors);
    const OLD_SET: (keyof Omit<CalColors, "E">)[] = [
        "-1",
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6"
    ];
    for (const key of OLD_SET) {
        if (!(key in parsedColors)) {
            localStorage.setItem(
                "calColors",
                JSON.stringify(DEFAULT_RCARD_COLORS)
            );
            return DEFAULT_RCARD_COLORS;
        }
    }

    if (!("E" in parsedColors)) {
        for (const key in colorPalettes) {
            const palette = colorPalettes[key];
            const hslPalette = Object.entries(palette.colors)
                .map(([key, value]) => [key, rgbToHSL(value)])
                .reduce(
                    (acc, [key, value]) => ({ ...acc, [key]: value }),
                    {}
                ) as CalColors;

            let matching = true;
            for (const key of OLD_SET) {
                if (hslPalette[key] !== parsedColors[key]) {
                    matching = false;
                    break;
                }
            }
            if (matching) {
                parsedColors.E = hslPalette.E;
                localStorage.setItem("calColors", JSON.stringify(parsedColors));
                return parsedColors;
            }
        }
        const DEFAULT_E = "hsla(0, 0%, 80%)";
        parsedColors.E = DEFAULT_E;
        localStorage.setItem("calColors", JSON.stringify(parsedColors));
        return parsedColors;
    } else {
        return parsedColors;
    }
};

// HSL colors
const {
    subscribe: ccSubscribe,
    update: ccUpdate,
    set: ccSet
} = writable<CalColors>(initializeCalColors());

export const calColors = {
    subscribe: ccSubscribe,
    update: ccUpdate,
    set: (value: CalColors) => {
        ccSet(value);
        localStorage.setItem("calColors", JSON.stringify(value));
    }
};

/**
 * Calculates the CSS variables for a color scheme
 * @param scheme index of the color in the palette
 * @returns CSS variables for the color scheme
 */
export const getStyles = (scheme: keyof CalColors): string => {
    const cc = get(calColors);

    const textColor =
        parseInt(cc[scheme].split(",")[2].split("%")[0]) > 50
            ? darkenHSL(cc[scheme], 60)
            : darkenHSL(cc[scheme], -60);

    return Object.entries({
        "bg": cc[scheme],
        "bg-hover": darkenHSL(cc[scheme], 10),
        "text": textColor
    })
        .map(([key, value]) => `--${key}:${value}`)
        .join(";");
};
