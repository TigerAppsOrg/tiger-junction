import { darkenHSL } from "$lib/scripts/convert";
import { get, writable, type Writable } from "svelte/store";

//----------------------------------------------------------------------
// ReCal+
//----------------------------------------------------------------------

export type CalColors = {
    "-1": string,
    "0": string,
    "1": string,
    "2": string,
    "3": string,
    "4": string,
    "5": string,
    "6": string,
}

export const DEFAULT_RCARD_COLORS: CalColors = {
    "-1": "hsl(0, 0%, 66%)", 
    0: "hsl(119, 52%, 84%)", 
    1: "hsl(33, 84%, 77%)",   
    2: "hsl(237, 100%, 89%)", 
    3: "hsl(60, 86%, 86%)", 
    4: "hsl(353, 73%, 78%)",   
    5: "hsl(303, 74%, 86%)", 
    6: "hsl(272, 62%, 80%)", 
}

// HSL colors
const { subscribe: ccSubscribe, update: ccUpdate, set: ccSet }: Writable<CalColors> = writable(    
    typeof window !== "undefined" && localStorage.getItem("calColors") !== null
    ? JSON.parse(localStorage.getItem("calColors") as string)
    : DEFAULT_RCARD_COLORS
);

export const calColors = {
    subscribe: ccSubscribe,
    update: ccUpdate,
    set: (value: CalColors) => {
        ccSet(value);
        localStorage.setItem("calColors", JSON.stringify(value));
    }
}


/**
 * Calculates the CSS variables for a color scheme
 * @param scheme index of the color in the palette
 * @returns CSS variables for the color scheme
 */
export const calculateCssVars = (scheme: keyof CalColors, ...params: any): string => {
    const cc = get(calColors);

    let textColor = (parseInt(cc[scheme].split(",")[2].split("%")[0]) > 50) ? 
    darkenHSL(cc[scheme], 60)
    : darkenHSL(cc[scheme], -60);

    return Object.entries({
        "bg": cc[scheme],
        "bg-hover": darkenHSL(cc[scheme], 10),
        "text": textColor,
    }).map(([key, value]) => `--${key}:${value}`).join(';');
}
