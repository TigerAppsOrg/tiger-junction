import { writable, type Writable } from "svelte/store";

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

// HSL colors
const { subscribe: ccSubscribe, update: ccUpdate, set: ccSet }: Writable<CalColors> = writable(    
    typeof window !== "undefined" && localStorage.getItem("calColors") !== null
    ? JSON.parse(localStorage.getItem("calColors") as string)
    : {
    "-1": "hsl(0, 0%, 66%)", 
    0: "hsl(1, 100%, 69%)",   
    1: "hsl(35, 99%, 65%)",   
    2: "hsl(197, 34%, 72%)", 
    3: "hsl(60, 96%, 74%)", 
    4: "hsl(120, 52%, 75%)", 
    5: "hsl(330, 100%, 80%)", 
    6: "hsl(304, 33%, 70%)", 
});

export const calColors = {
    subscribe: ccSubscribe,
    update: ccUpdate,
    set: (value: CalColors) => {
        ccSet(value);
        localStorage.setItem("calColors", JSON.stringify(value));
    }
}