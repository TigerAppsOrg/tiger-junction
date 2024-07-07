import { darkenHSL, rgbToHSL } from "$lib/scripts/convert";
import { colorPalettes } from "$lib/scripts/ReCal+/palettes";
import { get, writable, type Writable } from "svelte/store";

//----------------------------------------------------------------------
// ReCal+
//----------------------------------------------------------------------

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
        for (let key in colorPalettes) {
            const palette = colorPalettes[key];
            const hslPalette = Object.entries(palette)
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
}: Writable<CalColors> = writable(initializeCalColors());

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
export const calculateCssVars = (
    scheme: keyof CalColors,
    ...params: any
): string => {
    const cc = get(calColors);

    let textColor =
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
