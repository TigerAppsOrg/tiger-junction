// Stores for ReCal+ app

import { normalizeText } from "$lib/scripts/convert";
import type { CourseData, RawCourseData } from "$lib/types/dbTypes";
import { writable, type Writable } from "svelte/store";

//----------------------------------------------------------------------
// Current Term/Schedule
//----------------------------------------------------------------------

// Current term id
export const currentTerm: Writable<number> = writable(1242);

// Current schedule id
export const currentSchedule: Writable<number> = writable(0);

//----------------------------------------------------------------------
// Search Results
//----------------------------------------------------------------------

const { set: setRes, update: updateRes, subscribe: subscribeRes }:
Writable<CourseData[]> = writable([]);

export const searchResults = {
    set: setRes,
    update: updateRes,
    subscribe: subscribeRes,

    /**
     * Filter the search results
     * @param query input
     * @param term id of the term
     */
    search: (query: string, term: number, settings: SearchSettings): void => {
        let data: CourseData[] = [];
        rawCourseData.subscribe((x) => (
            data = x[term as keyof RawCourseData] ?? []
        ))();

        //--------------------------------------------------------------
        // Filter by settings
        //--------------------------------------------------------------

        // * Distribution requirements
        if (settings.filters["Dists"].enabled) {
            data = data.filter(x => {
                let enabled: boolean = false;
                for (let dist of x.dists) {
                    if (settings.filters["Dists"].values[dist]) {
                        enabled = true;
                        break;
                    }
                }
                return enabled;
            });
        }

        // * Open Only
        if (settings.filters["Open Only"].enabled) {
            data = data.filter(x => x.status === 0);
        }

        // * No Cancelled
        if (settings.filters["No Cancelled"].enabled) {
            data = data.filter(x => x.status !== 2);
        }

        // * Levels 
        if (settings.filters["Levels"].enabled) {
            data = data.filter(x => 
                settings.filters["Levels"]
                .values[x.code.charAt(3)]
            );
        }

        //--------------------------------------------------------------
        // Filter by search query
        //--------------------------------------------------------------

        if (query.length < 3 && !settings.options["All"])
             searchResults.set([]);

        else if (query.length === 3 && !settings.options["All"]) 
            searchResults.set(data.filter(x => {
                return normalizeText(x.code).includes(normalizeText(query))
            }));
        
        else searchResults.set(data.filter((x) => {
            let title: boolean = settings.options["Title"] && (
                normalizeText(x.title).includes(normalizeText(query))
            );
            let code: boolean = settings.options["Code"] && (
                normalizeText(x.code).includes(normalizeText(query))
            );
            let all: boolean = settings.options["All"] && (
                title || code 
            );
            return title || code || all;
        }));
    },
}

//----------------------------------------------------------------------
// Raw Course Data
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
// Search Settings
//----------------------------------------------------------------------

type Filter = {
    enabled: boolean,
    [key: string]: any,
}

export type SearchSettings = {
    options: Record<string, boolean>,
    filters: Record<string, Filter>,
    style: Record<string, boolean>,
}

export const searchSettings: Writable<SearchSettings> = writable({
    "options": {
        "Title": true,
        "Code": true,
        // "Instructor": true,
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
        // "Days": {
        //     "enabled": false,
        //     "values": {
        //         "Monday": true,
        //         "Tuesday": true,
        //         "Wednesday": true,
        //         "Thursday": true,
        //         "Friday": true,
        //     }
        // },
        "Levels": {
            "enabled": false,
            "values": {
                "1": true,
                "2": true,
                "3": true,
                "4": true,
                "5": true,
            }
        },
        "Open Only": {
            "enabled": false,
        },
        "No Cancelled": {
            "enabled": false,
        },
    },
    "style": {
        "Original Style": false,
        "Show Rating": true,
        "Color by Rating": false,
    }
})