// Change this file when adding a new term
import { get, writable, type Writable } from "svelte/store";
import type { CourseData } from "./types/dbTypes";
import type { RawSectionData } from "./stores/rsections";

// Add the new term at the top of the list
export const TERM_MAP: Record<number, Record<string, string>> = {
    1252: {
        name: "Fall 2024",
        mobile_name: "F24"
    },
    1244: {
        name: "Spring 2024",
        mobile_name: "S24"
    },
    1242: {
        name: "Fall 2023",
        mobile_name: "F23"
    },
    1234: {
        name: "Spring 2023",
        mobile_name: "S23"
    },
    1232: {
        name: "Fall 2022",
        mobile_name: "F22"
    },
    1224: {
        name: "Spring 2022",
        mobile_name: "S22"
    },
    1222: {
        name: "Fall 2021",
        mobile_name: "F21"
    },
    1214: {
        name: "Spring 2021",
        mobile_name: "S21"
    },
    1212: {
        name: "Fall 2020",
        mobile_name: "F20"
    },
    1204: {
        name: "Spring 2020",
        mobile_name: "S20"
    },
    1202: {
        name: "Fall 2019",
        mobile_name: "F19"
    },
    1194: {
        name: "Spring 2019",
        mobile_name: "S19"
    },
    1192: {
        name: "Fall 2018",
        mobile_name: "F18"
    }
};

// Add the new term at the top of the list
export const EVALS_TERM_MAP: Record<number, string> = {
    1252: "2024-2025 Fall Course Evaluation Results",
    1244: "2023-2024 Spring Course Evaluation Results",
    1242: "2023-2024 Fall Course Evaluation Results",
    1234: "2022-2023 Spring Course Evaluation Results",
    1232: "2022-2023 Fall Course Evaluation Results",
    1224: "2021-2022 Spring Course Evaluation Results",
    1222: "2021-2022 Fall Course Evaluation Results",
    1214: "2020-2021 Spring Course Evaluation Results",
    1212: "2020-2021 Fall Course Evaluation Results",
    1204: "2019-2020 Spring Course Evaluation Results",
    1202: "2019-2020 Fall Course Evaluation Results",
    1194: "2018-2019 Spring Course Evaluation Results",
    1192: "2018-2019 Fall Course Evaluation Results"
};

// Add the new term at the top of the list
// start/end are in the format [year, month, day]
// start_day is the day of the week the term starts on (1 = Monday, 7 = Sunday)
// Ignore exclusions for now, they're not used, set to []
// Delete the old term at the bottom of the list
export const CALENDAR_INFO: Record<string, Calendar_Info> = {
    "1252": {
        name: "Fall 2024",
        start: [2024, 9, 3],
        start_day: 2,
        end: [2024, 12, 5],
        exclusions: []
    },
    "1244": {
        name: "Spring 2024",
        start: [2024, 1, 29],
        start_day: 1,
        end: [2024, 4, 26],
        exclusions: [[2024, 3, 4]]
    },
    "1242": {
        name: "Fall 2023",
        start: [2023, 9, 5],
        start_day: 2,
        end: [2023, 12, 8],
        exclusions: [
            [2023, 10, 16, 6],
            [2023, 11, 22, 4]
        ]
    }
} as const;

// Add the new term and delete the oldest term (be careful!)
export type ActiveTerms = 1252 | 1242 | 1244;

// Add the new term at the top of the list
// Set the most recent term to true, and the rest to false
// Delete the oldest term (at the bottom)
export const sectionDone = writable({
    1244: false,
    1242: false,
    1252: true
});

//----------------------------------------------------------------------
// ! DO NOT EDIT BELOW THIS LINE
// TODO Refactor this and put it in a separate file
//----------------------------------------------------------------------

export type RawCourseData = Record<number, CourseData[]>;

// Last 3 terms
export const ACTIVE_TERMS: Record<
    number,
    Record<string, string>
> = Object.fromEntries(
    Object.entries(TERM_MAP).slice(
        Math.max(Object.keys(TERM_MAP).length - 3, 0)
    )
);

// Current term
export const CURRENT_TERM_ID: keyof RawCourseData = parseInt(
    Object.keys(TERM_MAP)[Object.keys(TERM_MAP).length - 1]
) as keyof RawCourseData;

export const currentTerm: Writable<number> = writable(CURRENT_TERM_ID);

// Types
type Calendar_Info = {
    name: string;
    start: readonly number[];
    start_day: number;
    end: readonly number[];
    exclusions: readonly number[][];
};

// Base objects
export const BASE_OBJ: RawCourseData = Object.keys(TERM_MAP)
    .map(x => parseInt(x))
    .slice(Math.max(Object.keys(TERM_MAP).length - 3, 0))
    .reduce((o, key) => Object.assign(o, { [key]: [] }), {}) as RawCourseData;

export const SECTION_OBJ: RawSectionData = Object.keys(TERM_MAP)
    .map(x => parseInt(x))
    .slice(Math.max(Object.keys(TERM_MAP).length - 3, 0))
    .reduce((o, key) => Object.assign(o, { [key]: {} }), {}) as RawSectionData;

function createScheduleStore() {
    const store: Writable<RawCourseData> = writable(
        JSON.parse(JSON.stringify(BASE_OBJ))
    );

    return {
        set: store.set,
        update: store.update,
        subscribe: store.subscribe,

        /**
         * Check if a schedule is in any term
         * @param scheduleId Id of the schedule to check
         * @returns The term the schedule is in, or null if it is not in any term
         */
        includes: (scheduleId: number): number | null => {
            const schedules = get(store);
            for (let i = 0; i < Object.keys(schedules).length; i++) {
                const term = parseInt(Object.keys(schedules)[i]);
                const scheduleList = schedules[term];
                for (let j = 0; j < scheduleList.length; j++) {
                    if (scheduleList[j].id == scheduleId) {
                        return term;
                    }
                }
            }
            return null;
        }
    };
}

export const schedules = createScheduleStore();
