import { writable, type Writable } from "svelte/store";

//----------------------------------------------------------------------
// ReCal+
//----------------------------------------------------------------------

export type CalColors = {
    "-1": string,
    0: string,
    1: string,
    2: string,
    3: string,
    4: string,
    5: string,
    6: string,
}

// HSL colors
export const calColors: Writable<CalColors> = writable({
    "-1": "hsl(0, 0%, 66%)", 
    0: "hsl(0, 90%, 60%)",   
    1: "hsl(30, 90%, 60%)",   
    2: "hsl(195, 70%, 70%)", 
    3: "hsl(60, 100%, 50%)", 
    4: "hsl(120, 40%, 60%)", 
    5: "hsl(330, 100%, 80%)", 
    6: "hsl(270, 60%, 70%)", 
});