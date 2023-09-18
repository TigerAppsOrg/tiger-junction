// Stores for ReCal+ app

import { normalizeText } from "$lib/scripts/convert";
import type { CourseData, RawCourseData } from "$lib/types/dbTypes";
import { writable, type Writable } from "svelte/store";
import { sectionData } from "./rsections";

//----------------------------------------------------------------------
// Current Term/Schedule
//----------------------------------------------------------------------

// Ready for calendar render
export const ready: Writable<boolean> = writable(false);

// Force rerendering of top area
export const retop: Writable<boolean> = writable(false);

// Force rerendering of calendar
export const recal: Writable<boolean> = writable(false);

// Hovered course
export const hoveredCourse: Writable<CourseData | null> = writable(null);

// Current term id
export const currentTerm: Writable<number> = writable(1242);

// Current schedule id
export const currentSchedule: Writable<number> = writable();

// User schedules
export const schedules: Writable<Record<number, {
    id: number,
    title: string,
}[]>> = writable({
    1242: [],
    1234: [],
    1232: []
})

export const isResult: Writable<boolean> = writable(false);

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
        // Current current search data
        if (!searchCourseData.get(term)) 
            searchCourseData.reset(term);
        
        let data: CourseData[] = searchCourseData.get(term) as CourseData[];

        //--------------------------------------------------------------
        // Filter by settings
        //--------------------------------------------------------------

        // * Distribution requirements
        if (settings.filters["Dists"].enabled) {
            data = data.filter(x => {
                let enabled: boolean = false;

                // If no dists, check if "No Dist" is enabled
                if ((!x.dists || x.dists.length === 0 
                    && settings.filters["Dists"].values["No Dist"]))
                    return true;

                // Check if any dist is enabled
                for (let dist of x.dists) {
                    if (settings.filters["Dists"].values[dist]) {
                        enabled = true;
                        break;
                    }
                }
                return enabled;
            });
        }

        // * PDFable
        if (settings.filters["PDFable"].enabled) {
            data = data.filter(x => x.basis !== "NPD" && x.basis !== "GRD");
        }

        // * PDF Only
        if (settings.filters["PDF Only"].enabled) {
            data = data.filter(x => x.basis === "PDF");
        }

        // * No Final
        if (settings.filters["No Scheduled Final"].enabled) {
            data = data.filter(x => !x.grading_info.hasOwnProperty("Final Scheduled Exam"));
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

        query = normalizeText(query);
        if (query.length < 3 && !settings.options["All"])
             searchResults.set([]);

        else if (query.length === 3 && !settings.options["All"]) 
            searchResults.set(data.filter(x => {
                return normalizeText(x.code).includes(query)
            }));
        
        else searchResults.set(data.filter((x) => {
            let title: boolean = settings.options["Title"] && (
                normalizeText(x.title).includes(query)
            );
            let code: boolean = settings.options["Code"] && (
                normalizeText(x.code).includes(query)
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
/* Note: Raw course data is data for all courses from db, while
search course data is data for all courses excluding those that
are pinned or saved. This speeds up search results when there
are many pinned/saved courses. */

const { set: setRaw, update: updateRaw, subscribe: subscribeRaw }: 
Writable<RawCourseData> = writable({
    1242: [],
    1234: [],
    1232: []
});

export const rawCourseData = {
    set: setRaw,
    update: updateRaw,
    subscribe: subscribeRaw,

    /**
     * Get a deep copy of the raw course data for a given term
     * @param term id of the term
     * @returns raw course data for the given term
     */
    get: (term: number): CourseData[] => {
        let data: CourseData[] = [];
        rawCourseData.subscribe((x) => (
            data = [...x[term as keyof RawCourseData]]
        ))();
        return data;
    },

    /**
     * Get a deep copy of the raw course data for all terms
     * @returns raw course data for all terms
     */
    getAll: (): RawCourseData => {
        let data: RawCourseData = {
            1242: [],
            1234: [],
            1232: []
        };
        rawCourseData.subscribe((x) => (
            data = JSON.parse(JSON.stringify(x))
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
        rawCourseData.subscribe((x) => (
            data = x[term as keyof RawCourseData].length > 0
        ))();
        return data;
    }
}

//----------------------------------------------------------------------
// Search Course Data
//----------------------------------------------------------------------

const { set: setSearch, update: updateSearch, subscribe: subscribeSearch }:
Writable<RawCourseData> = writable({
    1242: [],
    1234: [],
    1232: []
});

export const searchCourseData = {
    set: setSearch,
    update: updateSearch,
    subscribe: subscribeSearch,

    /**
     * Get search course data for a given term
     * @param term 
     * @returns search course data for the given term
     */
    get: (term: number): CourseData[] => {
        let data: CourseData[] = [];
        searchCourseData.subscribe((x) => (
            data = x[term as keyof RawCourseData]
        ))();
        return data;
    },

    /**
     * Get search course data for all terms
     * @returns search course data for all terms
     */
    getAll: (): RawCourseData => {
        let data: RawCourseData = {
            1242: [],
            1234: [],
            1232: []
        };
        searchCourseData.subscribe((x) => (
            data = x
        ))();
        return data;
    },

    /**
     * Remove course(s) from search course data
     * @param term 
     * @param course 
     */
    remove: (term: number, courses: CourseData[]): void => {
        for (let i = 0; i < courses.length; i++) {
            // Remove if in search course data
            searchCourseData.update(x => {
                x[term as keyof RawCourseData] = x[term as keyof RawCourseData]
                    .filter(y => (y.id !== courses[i].id));
                return x;
            });
        }
    },

    /**
     * Add course(s) to search course data
     * @param term 
     * @param course 
     */
    add: (term: number, courses: CourseData[]): void => {
        for (let i = 0; i < courses.length; i++) {
            searchCourseData.update(x => {

                // Push if not already in search course data
                if (!x[term as keyof RawCourseData].includes(courses[i])) {
                    x[term as keyof RawCourseData].push(courses[i]);
                }
                return x;
            })
        }
    },

    /**
     * Reset search course data to raw course data for a given term
     * @param term 
     */
    reset: (term: number): void => {
        searchCourseData.update((x) => {
            x[term as keyof RawCourseData] = rawCourseData.get(term);
            return x;
        });
    },

    /**
     * Reset search course data to raw course data for all terms
     */
    resetAll: () => {
        searchCourseData.set(rawCourseData.getAll());
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
        "PDFable": {
            "enabled": false,
        },
        "PDF Only": {
            "enabled": false,
        },
        "No Scheduled Final": {
            "enabled": false,
        },
        "Open Only": {
            "enabled": false,
        },
        "No Cancelled": {
            "enabled": false,
        },
    },
    "style": {
        // "Original Style": false,
        "Show Rating": true,
        "Color by Rating": false,
        "Always Show Enrollments": false,
        "Show Tooltips": true,
    }
});