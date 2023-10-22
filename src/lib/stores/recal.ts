// Stores for ReCal+ app
import { normalizeText } from "$lib/scripts/convert";
import type { CourseData, RawCourseData } from "$lib/types/dbTypes";
import { writable, type Writable } from "svelte/store";

//----------------------------------------------------------------------
// Forcers
//----------------------------------------------------------------------

// Ready for calendar render
export const ready: Writable<boolean> = writable(false);

// Force rerendering of top area
export const retop: Writable<boolean> = writable(false);

// Force rerendering of calendar
export const recal: Writable<boolean> = writable(false);

// Force rerendering of search results
export const research: Writable<boolean> = writable(false);

//----------------------------------------------------------------------
// Current Term/Schedule
//----------------------------------------------------------------------

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

        // * Rating
        if (settings.filters["Rating"].enabled) {
            data = data.filter(x => {
                let rating: number = x.rating ? x.rating : 0;
                return rating >= settings.filters["Rating"].min
                    && rating <= settings.filters["Rating"].max;
            });
        }

        // * Distribution requirements
        if (settings.filters["Dists"].enabled) {
            data = data.filter(x => {
                let enabled: boolean = false;

                // If no dists, check if "No Dist" is enabled
                if (!x.dists || x.dists.length === 0) {
                    if (settings.filters["Dists"].values["No Dist"]) return true;
                    else return false;
                }

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
        // SortBy Settings
        //--------------------------------------------------------------

        // * Default Sort (Alphabetical)
        data = data.sort((a, b) => {
            return a.code > b.code ? 1 : -1
        });

        // * Rating
        if (settings.sortBy["Rating"].enabled) {

            data = data.sort((a, b) => {
                let aRating: number = a.rating ? a.rating : 0;
                let bRating: number = b.rating ? b.rating : 0;

                return settings.sortBy["Rating"].value === 0 ?
                    (bRating - aRating) : (aRating - bRating);
            });
        }

        // * Weighted Rating
        if (settings.sortBy["Weighted Rating"].enabled) {

            data = data.sort((a, b) => {
                let aRating: number = a.adj_rating ? a.adj_rating : 0;
                let bRating: number = b.adj_rating ? b.adj_rating : 0;

                return settings.sortBy["Weighted Rating"].value === 0 ?
                    (bRating - aRating) : (aRating - bRating);
            });
        }


        //--------------------------------------------------------------
        // Filter by search query
        //--------------------------------------------------------------

        query = normalizeText(query);
        if (query.length < 3 && !settings.filters["Show All"].enabled)
             searchResults.set([]);

        else if (query.length === 3 && !settings.filters["Show All"].enabled) 
            searchResults.set(data.filter(x => {
                return normalizeText(x.code).includes(query)
            }));
        
        else searchResults.set(data.filter((x) => {
            return normalizeText(x.title).includes(query) 
                || normalizeText(x.code).includes(query);
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

type SortBy = {
    enabled: boolean,
    options: string[],
    value: number,
}

export type SearchSettings = {
    options: Record<string, boolean>,
    filters: Record<string, Filter>,
    sortBy: Record<string, SortBy>,
    style: Record<string, boolean>,
}

export const currentSortBy: Writable<string | null> = writable(null);

export const DEFAULT_SETTINGS: SearchSettings = {
    "options": {
        // "Title": true,
        // "Code": true,
        // "Instructor": true,
        // "Smart Search": false,
    }, 
    "filters": {
        "Show All": {
            "enabled": false,
        },
        "Rating": {
            "enabled": false,
            "min": 0,
            "max": 5,
        },
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
    "sortBy": {
        "Rating": {
            "enabled": false,
            "options": ["High to Low", "Low to High"],
            "value": 0,
        },
        "Weighted Rating": {
            "enabled": false,
            "options": ["High to Low", "Low to High"],
            "value": 0,
        },
    },
    "style": {
        // "Original Style": false,
        "Show Rating": true,
        "Show # of Comments": false,
        "Show Weighted Rating": false,
        "Color by Rating": false,
        "Always Show Rooms": false,
        "Show Enrollments": false,
        // "Show Tooltips": true,
        "Show Time Marks": false,
        "Duck": false,
    }
}

export const searchSettings: Writable<SearchSettings> = writable(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)));