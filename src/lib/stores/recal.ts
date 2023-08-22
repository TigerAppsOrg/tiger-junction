import type { CourseData, RawCourseData } from "$lib/types/dbTypes";
import { writable, type Writable } from "svelte/store";

// Current term id
export const currentTerm: Writable<number> = writable(1242);

// Current schedule index
export const currentSchedule: Writable<number> = writable(0);

//----------------------------------------------------------------------

const { set: setRaw, update: updateRaw, subscribe: subscribeRaw }: 
Writable<RawCourseData> = writable({
    1242: null,
    1234: null,
    1232: null
});

export const rawCourseData = {
    set: setRaw,
    update: updateRaw,
    subscribe: subscribeRaw,

    /**
     * Get the raw course data for a given term
     * @param term id of the term
     * @returns raw course data for the given term
     */
    get: (term: number): CourseData[] | null => {
        let data: CourseData[] | null = null;
        rawCourseData.subscribe((x) => (
            data = x[term as keyof RawCourseData]
        ))();
        return data;
    },

    /**
     * Check if the raw course data for a given term is loaded
     * @param term id of the term
     * @returns true if the raw course data for the given term is loaded
     */
    check: (term: number): boolean => {
        let data: boolean  = false;
        let unsub = rawCourseData.subscribe((x) => (
            data = x[term as keyof RawCourseData] !== null
        ));
        unsub();
        return data;
    }
}

//----------------------------------------------------------------------

type SearchSettings = {
    options: Record<string, boolean>,
    filters: Record<string, any>,
}

export const searchSettings: Writable<SearchSettings> = writable({
    "options": {
        "Title": true,
        "Code": true,
        "Instructor": true,
        "All": false,
        // "Smart Search": false,
    }, 
    "filters": {
        "Dists": {
            "enabled": false,
            "values": {
                "CD": true,
                "EC": true,
                "EM": true,
                "HA": true,
                "LA": true,
                "QCR": true,
                "SA": true,
                "SEL": true,
                "SEN": true,
                "No Dist": true,
            }
        },
        "Days": {
            "enabled": false,
            "values": {
                "Monday": true,
                "Tuesday": true,
                "Wednesday": true,
                "Thursday": true,
                "Friday": true,
            }
        },
        "Levels": {
            "enabled": false,
            "values": {
                "100": true,
                "200": true,
                "300": true,
                "400": true,
                "500": true,
                "1000": true,
            }
        },
        "Open Only": {
            "enabled": false,
        }
    }
})