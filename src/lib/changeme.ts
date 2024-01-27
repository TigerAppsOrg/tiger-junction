// When adding a new semester, you only need to change this file
// not counting database changes.
// ! For the objects and arrays, order DOES matter.
import type { RawCourseData } from "./types/dbTypes";

export const TERM_MAP: Record<string, number> = {
    "SPRING_2024": 1244,
    "FALL_2023": 1242,
    "SPRING_2023": 1234,
    "FALL_2022": 1232,
    "SPRING_2022": 1224,
    "FALL_2021": 1222,
    "SPRING_2021": 1214,
    "FALL_2020": 1212,
    "SPRING_2020": 1204,
    "FALL_2019": 1202,
    "SPRING_2019": 1194,
    "FALL_2018": 1192,
}

export const EVALS_TERM_MAP: Record<number, string> = {
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
    1192: "2018-2019 Fall Course Evaluation Results",
}

export const ACTIVE_TERMS: Record<number, Record<string, string>> = {
    1234: {
        "name": "Spring 2023",
        "mobile_name": "S23"
    },
    1242: {
        "name": "Fall 2023",
        "mobile_name": "F23"
    },
    1244: {
        "name": "Spring 2024",
        "mobile_name": "S24"
    }
}

export const CURRENT_TERM_NAME = "SPRING_2024";
export const CURRENT_TERM_ID: keyof RawCourseData = 1244;

type Calendar_Info = {
    name: string,
    start: readonly number[],
    start_day: number,
    end: readonly number[],
    exclusions: readonly number[][],
}

// Dates for each term
export const CALENDAR_INFO: Record<string, Calendar_Info> = {
    "1244": {
        "name": "Spring 2024",
        "start":[2024, 1, 29],
        "start_day": 1,
        "end": [2024, 4, 26],
        "exclusions": [],
    },
    "1242": {
        "name": "Fall 2023",
        "start":[2023, 9, 5],
        "start_day": 2,
        "end": [2023, 12, 8],
        "exclusions": [[2023, 10, 16, 6], [2023, 11, 22, 4]]
    },
    "1234": {
        "name": "Spring 2023",
        "start": [2023, 2, 7], 
        "start_day": 1,
        "end": [2023, 5, 10], 
        "exclusions": [],
    },
} as const;