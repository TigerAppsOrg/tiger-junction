import type { RawCourseData } from "./types/dbTypes";
import type { RegGradingInfo } from "./types/regTypes";

// Emailing List Form
const EMAIL_LIST_FORM_LINK = "https://docs.google.com/forms/d/e/1FAIpQLSebVwd90RtgYf0WtPueOF2BUh8gX2zl-C6Tbjtfxo1E6jo6xA/viewform?usp=sf_link";

// Database
const CATEGORIES = ["ab", "bse", "certificate", "minor"];

// Registrar API
const TERM_URL = 'https://api.princeton.edu/registrar/course-offerings/classes/';
const COURSE_URL = 'https://api.princeton.edu/registrar/course-offerings/1.0.2/course-details?'
const EVALUATION_URL = "https://registrarapps.princeton.edu/course-evaluation?";

// Terms
const TERM_MAP: Record<string, number> = {
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

const EVALS_TERM_MAP: Record<number, string> = {
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

const CURRENT_TERM_NAME = "SPRING_2024";
const CURRENT_TERM_ID: keyof RawCourseData = 1244;

const GENERIC_GRADING_INFO: RegGradingInfo = {
    grading_design_projects: "Design Project", 
    grading_final_exam: "Final Scheduled Exam",
    grading_home_final_exam: "Take Home Final Exam",
    grading_home_mid_exam: "Take Home Midterm Exam", 
    grading_lab_reports: "Lab Reports",
    grading_mid_exam: "Midterm Exam",
    grading_oral_pres: "Presentation or Performance",
    grading_other: "Other", 
    grading_other_exam: "Exam(s) Given During Term",
    grading_paper_final_exam: "Final Paper or Project",
    grading_paper_mid_exam: "Midterm Paper or Project", 
    grading_papers: "Papers/Writing Assignments",
    grading_precept_part: "Participation",
    grading_prob_sets: "Problem Sets",
    grading_prog_assign: "Programming Assignments",
    grading_quizzes: "Quizzes", 
    grading_term_papers: "Term Paper(s)", 
    pu_pres_final_exam: "Final presentation or Performance",
    pu_projects: "Project(s)",
};

const STATUS_MAP: Record<string, number> = {
    "Open": 0,
    "Closed": 1,
    "Canceled": 2,
    "Other": 3,
}

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

export const DEPARTMENTS = [
    "AAS",
    "AFS",
    "AMS",
    "ANT",
    "AOS",
    "APC",
    "ARA",
    "ARC",
    "ART",
    "ASA",
    "ASL",
    "AST",
    "ATL",
    "BCS",
    "CBE",
    "CEE",
    "CGS",
    "CHI",
    "CHM",
    "CHV",
    "CLA",
    "CLG",
    "COM",
    "COS",
    "CSE",
    "CWR",
    "DAN",
    "EAS",
    "ECE",
    "ECO",
    "ECS",
    "EEB",
    "EGR",
    "ENE",
    "ENG",
    "ENT",
    "ENV",
    "EPS",
    "FIN",
    "FRE",
    "FRS",
    "GEO",
    "GER",
    "GHP",
    "GSS",
    "HEB",
    "HIN",
    "HIS",
    "HLS",
    "HOS",
    "HUM",
    "ISC",
    "ITA",
    "JDS",
    "JPN",
    "JRN",
    "KOR",
    "LAO",
    "LAS",
    "LAT",
    "LIN",
    "MAE",
    "MAT",
    "MED",
    "MOD",
    "MOG",
    "MOL",
    "MPP",
    "MSE",
    "MTD",
    "MUS",
    "NES",
    "NEU",
    "ORF",
    "PER",
    "PHI",
    "PHY",
    "POL",
    "POP",
    "POR",
    "PSY",
    "QCB",
    "REL",
    "RES",
    "RUS",
    "SAN",
    "SAS",
    "SLA",
    "SML",
    "SOC",
    "SPA",
    "SPI",
    "STC",
    "SWA",
    "THR",
    "TPP",
    "TRA",
    "TUR",
    "TWI",
    "URB",
    "URD",
    "VIS",
    "WRI"
]

// Maximum number of schedules in a term for a user
export const SCHEDULE_CAP = 10;

export { 
    EMAIL_LIST_FORM_LINK,
    CATEGORIES, 
    TERM_URL,
    COURSE_URL,
    EVALUATION_URL,
    TERM_MAP,
    EVALS_TERM_MAP,
    CURRENT_TERM_NAME,
    CURRENT_TERM_ID,
    GENERIC_GRADING_INFO,
    STATUS_MAP,
};