import { type SectionData } from "$lib/stores/rsections";
import { type CalColors } from "$lib/stores/styles";
import { type CourseData } from "$lib/types/dbTypes";
import { writable, type Writable } from "svelte/store";

type BaseBoxParam = {
    color: keyof CalColors;
    day: number;
    slot: number;
    maxSlot: number;
    colSpan: number;
    height: string;
    width: string;
    top: string;
    left: string;
};

export type CourseBoxParam = BaseBoxParam & {
    type: "course";
    courseCode: string;
    section: SectionData;
    confirmed: boolean;
};

export type EventBoxParam = BaseBoxParam & {
    type: "event";
    section: {
        start_time: number;
        end_time: number;
        days: number;
    };
};

export type BoxParam = CourseBoxParam | EventBoxParam;

export function isCourseBox(param: BoxParam): param is CourseBoxParam {
    return param.type === "course";
}

// Card hovered --> highlights calendar
export const hovStyle: Writable<CourseData | null> = writable(null);

// CalBox hovered --> highlights card
export const hovStyleRev: Writable<number | null> = writable(null);
