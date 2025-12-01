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

export type BackgroundEffects = {
    noise: {
        enabled: boolean;
        opacity: number; // 0-1
        baseFrequency: number; // default 1.5
    };
    glows: {
        enabled: boolean;
        color1: string; // HSL
        color2: string; // HSL
        opacity: number; // 0-1
    };
};

export const DEFAULT_BG_EFFECTS: BackgroundEffects = {
    noise: {
        enabled: false,
        opacity: 0.5,
        baseFrequency: 1.5
    },
    glows: {
        enabled: false,
        color1: "hsl(36, 100%, 50%)", // orange
        color2: "hsl(211, 100%, 50%)", // blue
        opacity: 0.15
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
                    color1:
                        parsed.glows.color1 ?? DEFAULT_BG_EFFECTS.glows.color1,
                    color2:
                        parsed.glows.color2 ?? DEFAULT_BG_EFFECTS.glows.color2,
                    opacity:
                        parsed.glows.opacity ?? DEFAULT_BG_EFFECTS.glows.opacity
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
