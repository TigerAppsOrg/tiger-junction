// Stores for ReCal+ app
import { normalizeText, valueToDays } from "$lib/scripts/convert";
import type { CourseData } from "$lib/types/dbTypes";
import { BASE_OBJ, type RawCourseData } from "$lib/changeme";
import { get, writable } from "svelte/store";
import { sectionData, type SectionMap } from "./rsections";
import { sectionDone } from "$lib/changeme";
import { savedCourses } from "./rpool";
import { doesConflict } from "$lib/scripts/ReCal+/conflict";
import type { ActiveTerms } from "$lib/changeme";
import { scheduleEventMap } from "./events";

//----------------------------------------------------------------------
// Forcers
//----------------------------------------------------------------------

// Ready for calendar render
export const ready = writable<boolean>(false);

// Force rerendering of top area
export const retop = writable<boolean>(false);

// Force rerendering of calendar
export const recal = writable<boolean>(false);

// Force rerendering of search results
export const research = writable<boolean>(false);

//----------------------------------------------------------------------
// State
//----------------------------------------------------------------------

// Current schedule id
export const currentSchedule = writable<number>();

// Whether there are any search results
export const isResult = writable<boolean>(false);

//----------------------------------------------------------------------
// Search Results
//----------------------------------------------------------------------

const {
    set: setRes,
    update: updateRes,
    subscribe: subscribeRes
} = writable<CourseData[]>([]);

export const searchResults = {
    set: setRes,
    update: updateRes,
    subscribe: subscribeRes,

    /**
     * Filter the search results
     * @param query input
     * @param term id of the term
     */
    search: async (query: string, term: number, settings: SearchSettings) => {
        // Current current search data
        if (!searchCourseData.get(term)) searchCourseData.reset(term);

        let data: CourseData[] = searchCourseData.get(term) as CourseData[];

        //--------------------------------------------------------------
        // Filter by settings
        //--------------------------------------------------------------

        // * Rating
        if (settings.filters["Rating"].enabled) {
            data = data.filter(x => {
                const rating: number = x.rating ? x.rating : 0;
                return (
                    rating >= settings.filters["Rating"].min &&
                    rating <= settings.filters["Rating"].max
                );
            });
        }

        // * Distribution requirements
        if (settings.filters["Dists"].enabled) {
            data = data.filter(x => {
                let enabled: boolean = false;

                // If no dists, check if "No Dist" is enabled
                if (!x.dists || x.dists.length === 0) {
                    if (settings.filters["Dists"].values["No Dist"])
                        return true;
                    else return false;
                }

                // Check if any dist is enabled
                for (const dist of x.dists) {
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
            data = data.filter(x => !x.has_final);
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
            data = data.filter(
                x => settings.filters["Levels"].values[x.code.charAt(3)]
            );
        }

        // * Does Not Conflict
        if (settings.filters["No Conflicts"].enabled) {
            // Fetch all sections for all courses in term
            const termSec = get(sectionData)[term];
            await loadSections(term, termSec);

            // Get confirmed sections and format into array
            const conflictList: Record<number, [number, number][]> = {
                1: [],
                2: [],
                3: [],
                4: [],
                5: []
            };

            const curSched = get(currentSchedule);
            const saved = get(savedCourses)[curSched];
            const meta = get(scheduleCourseMeta)[curSched];
            const events = scheduleEventMap.getSchedule(curSched);

            if (saved && meta) {
                for (let i = 0; i < saved.length; i++) {
                    const courseSections = termSec[saved[i].id];
                    const courseMeta = meta[saved[i].id];

                    if (!courseMeta || !courseSections) continue;

                    for (let j = 0; j < courseSections.length; j++) {
                        const nSec = courseSections[j];

                        // Continue if not confirmed
                        if (
                            Object.prototype.hasOwnProperty.call(
                                courseMeta.confirms,
                                nSec.category
                            )
                        ) {
                            // Legacy compatibility
                            if (
                                typeof courseMeta.confirms[nSec.category] ===
                                "number"
                            ) {
                                if (
                                    parseInt(
                                        courseMeta.confirms[nSec.category]
                                    ) !== nSec.id
                                )
                                    continue;
                            } else if (
                                courseMeta.confirms[nSec.category] !==
                                nSec.title
                            )
                                continue;
                        } else continue;

                        // Add to conflict list if confirmed
                        const days = valueToDays(nSec.days);
                        o: for (let k = 0; k < days.length; k++) {
                            const day = days[k];

                            // Check if time conflicts
                            for (let l = 0; l < conflictList[day].length; l++) {
                                const start = conflictList[day][l][0];
                                const end = conflictList[day][l][1];
                                if (
                                    nSec.start_time < end &&
                                    nSec.end_time > start
                                )
                                    break o;
                            }

                            // Add to conflict list
                            conflictList[day].push([
                                nSec.start_time,
                                nSec.end_time
                            ]);
                        } // ! End of days loop
                    } // ! End of courseSections loop
                } // ! End of saved courses loop
            }

            // TODO This has a lot of duplicate code, perhaps refactor?
            if (events.length > 0) {
                for (let i = 0; i < events.length; i++) {
                    const event = events[i];
                    for (let j = 0; j < event.times.length; j++) {
                        const timeBlock = event.times[j];
                        const days = valueToDays(timeBlock.days);

                        o: for (let k = 0; k < days.length; k++) {
                            const day = days[k];

                            for (let l = 0; l < conflictList[day].length; l++) {
                                const start = conflictList[day][l][0];
                                const end = conflictList[day][l][1];
                                if (
                                    timeBlock.start < end &&
                                    timeBlock.end > start
                                )
                                    break o;
                            }

                            conflictList[day].push([
                                timeBlock.start,
                                timeBlock.end
                            ]);
                        }
                    }
                }
            }

            // Sort conflict list
            for (const day in conflictList)
                conflictList[day] = conflictList[day].sort((a, b) => {
                    return a[0] - b[0];
                });

            // Check if any conflicts and filter
            data = data.filter(
                x =>
                    !doesConflict(
                        x,
                        conflictList,
                        settings.filters["No Conflicts"].values[
                            "Only Available Sections"
                        ],
                        settings.filters["Days"]
                    )
            );
        } // ! End of "Does Not Conflict" filter

        // * Days
        if (settings.filters["Days"].enabled) {
            const termSec = get(sectionData)[term];
            await loadSections(term, termSec);

            data = data.filter(x => {
                const courseSections = termSec[x.id];

                // Default -- if no sections, return false
                if (courseSections.length === 0) return false;

                let scheduledSectionExists = false;
                for (let i = 0; i < courseSections.length; i++) {
                    if (courseSections[i].start_time !== -42) {
                        scheduledSectionExists = true;
                        break;
                    }
                }
                if (!scheduledSectionExists) return false;

                const catmap: Record<string, boolean> = {};
                for (let i = 0; i < courseSections.length; i++) {
                    const section = courseSections[i];
                    const daysNum = valueToDays(section.days);
                    const dayMap: Record<number, string> = {
                        1: "M",
                        2: "T",
                        3: "W",
                        4: "R",
                        5: "F"
                    };
                    const days = daysNum.map(x => dayMap[x]);
                    const category = section.category;

                    let isThisSectionOkay = true;
                    for (let j = 0; j < days.length; j++) {
                        if (!settings.filters["Days"].values[days[j]]) {
                            isThisSectionOkay = false;
                            break;
                        }
                    }
                    if (isThisSectionOkay) catmap[category] = true;
                    else if (
                        !Object.prototype.hasOwnProperty.call(catmap, category)
                    )
                        catmap[category] = false;
                }

                let isCourseOkay = true;
                for (const category in catmap) {
                    if (!catmap[category]) {
                        isCourseOkay = false;
                        break;
                    }
                }
                return isCourseOkay;
            });
        }

        //--------------------------------------------------------------
        // SortBy Settings
        //--------------------------------------------------------------

        // * Default Sort (Alphabetical)
        data = data.sort((a, b) => {
            return a.code > b.code ? 1 : -1;
        });

        // * Rating
        if (settings.sortBy["Rating"].enabled) {
            data = data.sort((a, b) => {
                const aRating: number = a.rating ? a.rating : 0;
                const bRating: number = b.rating ? b.rating : 0;

                return settings.sortBy["Rating"].value === 0
                    ? bRating - aRating
                    : aRating - bRating;
            });
        }

        // * Weighted Rating
        if (settings.sortBy["Weighted Rating"].enabled) {
            data = data.sort((a, b) => {
                const aRating: number = a.adj_rating ? a.adj_rating : 0;
                const bRating: number = b.adj_rating ? b.adj_rating : 0;

                return settings.sortBy["Weighted Rating"].value === 0
                    ? bRating - aRating
                    : aRating - bRating;
            });
        }

        //--------------------------------------------------------------
        // Filter by search query
        //--------------------------------------------------------------

        query = normalizeText(query);
        if (query.length < 3 && !settings.filters["Show All"].enabled)
            searchResults.set([]);
        else if (query.length === 3 && !settings.filters["Show All"].enabled)
            searchResults.set(
                data.filter(x => {
                    return normalizeText(x.code).includes(query);
                })
            );
        else
            searchResults.set(
                data.filter(x => {
                    return (
                        normalizeText(x.title).includes(query) ||
                        normalizeText(x.code).includes(query)
                    );
                })
            );

        if (get(searchResults).length === 0) {
            isResult.set(false);
        } else {
            isResult.set(true);
        }
    }
};

//----------------------------------------------------------------------
// Raw Course Data
//----------------------------------------------------------------------
/* Note: Raw course data is data for all courses from db, while
search course data is data for all courses excluding those that
are saved. This speeds up search results when there
are many saved courses. */

const {
    set: setRaw,
    update: updateRaw,
    subscribe: subscribeRaw
} = writable<RawCourseData>(JSON.parse(JSON.stringify(BASE_OBJ)));

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
        rawCourseData.subscribe(
            x => (data = [...x[term as keyof RawCourseData]])
        )();
        return data;
    },

    /**
     * Get a deep copy of the raw course data for all terms
     * @returns raw course data for all terms
     */
    getAll: (): RawCourseData => {
        let data: RawCourseData = JSON.parse(JSON.stringify(BASE_OBJ));
        rawCourseData.subscribe(x => (data = JSON.parse(JSON.stringify(x))))();
        return data;
    },

    /**
     * Check if the raw course data for a given term is loaded
     * @param term id of the term
     * @returns true if the raw course data for the given term is loaded
     */
    check: (term: number): boolean => {
        let data: boolean = false;
        rawCourseData.subscribe(
            x => (data = x[term as keyof RawCourseData].length > 0)
        )();
        return data;
    }
};

//----------------------------------------------------------------------
// Search Course Data
//----------------------------------------------------------------------

const {
    set: setSearch,
    update: updateSearch,
    subscribe: subscribeSearch
} = writable<RawCourseData>(JSON.parse(JSON.stringify(BASE_OBJ)));

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
        searchCourseData.subscribe(
            x => (data = x[term as keyof RawCourseData])
        )();
        return data;
    },

    /**
     * Get search course data for all terms
     * @returns search course data for all terms
     */
    getAll: (): RawCourseData => {
        let data: RawCourseData = JSON.parse(JSON.stringify(BASE_OBJ));
        searchCourseData.subscribe(x => (data = x))();
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
                x[term as keyof RawCourseData] = x[
                    term as keyof RawCourseData
                ].filter(y => y.id !== courses[i].id);
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
            });
        }
    },

    /**
     * Reset search course data to raw course data for a given term
     * @param term
     */
    reset: (term: number): void => {
        searchCourseData.update(x => {
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
};

//----------------------------------------------------------------------
// Search Settings
//----------------------------------------------------------------------

type Filter = {
    enabled: boolean;
    [key: string]: any;
};

type SortBy = {
    enabled: boolean;
    options: string[];
    value: number;
};

export type SearchSettings = {
    filters: Record<string, Filter>;
    sortBy: Record<string, SortBy>;
    style: Record<string, boolean>;
};

export const currentSortBy = writable<string | null>(null);

export const DEFAULT_SETTINGS: SearchSettings = {
    filters: {
        "Show All": {
            enabled: false
        },
        "Rating": {
            enabled: false,
            min: 0,
            max: 5
        },
        "Dists": {
            enabled: false,
            values: {
                "CD": true,
                "EC": true,
                "EM": true,
                "HA": true,
                "LA": true,
                "QCR": true,
                "SA": true,
                "SEL": true,
                "SEN": true,
                "No Dist": true
            }
        },
        "Levels": {
            enabled: false,
            values: {
                "1": true,
                "2": true,
                "3": true,
                "4": true,
                "5": true
            }
        },
        "Days": {
            enabled: false,
            values: {
                M: true,
                T: true,
                W: true,
                R: true,
                F: true
            }
        },
        "PDFable": {
            enabled: false
        },
        "PDF Only": {
            enabled: false
        },
        "No Scheduled Final": {
            enabled: false
        },
        "Open Only": {
            enabled: false
        },
        "No Cancelled": {
            enabled: false
        },
        "No Conflicts": {
            enabled: false,
            values: {
                "Only Available Sections": false
            }
        }
    },
    sortBy: {
        "Rating": {
            enabled: false,
            options: ["High to Low", "Low to High"],
            value: 0
        },
        "Weighted Rating": {
            enabled: false,
            options: ["High to Low", "Low to High"],
            value: 0
        }
    },
    style: {
        "Show Rating": true,
        "Show # of Comments": false,
        "Show Weighted Rating": false,
        "Color by Rating": false,
        "Always Show Rooms": false,
        "Always Show Enrollments": false,
        "Show Instructor(s)": false,
        // "Show Tooltips": true,
        "Show Time Marks": false,
        "Duck": false
    }
};

const loadSections = async (term: number, termSec: SectionMap) => {
    if (!get(sectionDone)[term as ActiveTerms]) {
        // Fetch Sections
        const secs = await fetch(`/api/client/sections/${term}`);
        const sections = await secs.json();

        // Blacklist of courses that are already loaded
        const blacklist: number[] = [];
        for (const courseId in termSec) blacklist.push(parseInt(courseId));

        // Sort through sections and add to sectionData
        for (let i = 0; i < sections.length; i++) {
            const sec = sections[i];
            const courseId = sec.course_id;

            if (blacklist.includes(courseId)) continue;

            // Add course to sectionData
            if (!termSec[courseId]) {
                termSec[courseId] = [];
            }
            termSec[courseId].push(sec);
        }

        // Mark sections for term as fully loaded
        sectionDone.update(x => {
            x[term as ActiveTerms] = true;
            return x;
        });
    }
};

export const searchSettings = writable<SearchSettings>(
    JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
);

export type ScheduleCourseMetadata = {
    complete: boolean;
    color: number;
    sections: string[];
    confirms: Record<string, string>;
};

// Map from schedule_id -> course_id -> metadata
export const scheduleCourseMeta = writable<
    Record<number, Record<number, ScheduleCourseMetadata>>
>({});
