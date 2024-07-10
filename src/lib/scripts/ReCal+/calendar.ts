/**
 * @file Calendar-related types and stores
 */

import type { UserCustomEvent } from "$lib/stores/events";
import type { SectionData } from "$lib/stores/rsections";
import type { CalColors } from "$lib/stores/styles";
import type { CourseData } from "$lib/types/dbTypes";
import { writable } from "svelte/store";

//----------------------------------------------------------------------
// Types
//----------------------------------------------------------------------

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
        title: string;
    };
    id: number;
};

export type BoxParam = CourseBoxParam | EventBoxParam;

// Type Guard for BoxParam
export function isCourseBox(param: BoxParam): param is CourseBoxParam {
    return param.type === "course";
}

//----------------------------------------------------------------------
// Stores
//----------------------------------------------------------------------

// Card hovered --> highlights calendar
export const courseHover = writable<number | null>(null);

// CalBox hovered --> highlights card
export const courseHoverRev = writable<number | null>(null);

// Event card hovered --> highlights calendar
export const eventHover = writable<number | null>(null);

// CalBox hovered --> highlights event card
export const eventHoverRev = writable<number | null>(null);

// Hovered course
export const hoveredCourse = writable<CourseData | null>(null);

// Hovered event
export const hoveredEvent = writable<UserCustomEvent | null>(null);
