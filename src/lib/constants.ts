import type { RegGradingInfo } from "./types/regTypes";

// Check this for updates every term
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
    "BNG",
    "CBE",
    "CDH",
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
    "CTL",
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
    "GEZ",
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
    "LCA",
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
    "PAW",
    "PER",
    "PHI",
    "PHY",
    "PLS",
    "POL",
    "POP",
    "POR",
    "PSY",
    "QCB",
    "QSE",
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
    "UKR",
    "URB",
    "URD",
    "VIS",
    "WRI"
];

// Emailing List Form
export const EMAIL_LIST_FORM_LINK =
    "https://docs.google.com/forms/d/e/1FAIpQLSebVwd90RtgYf0WtPueOF2BUh8gX2zl-C6Tbjtfxo1E6jo6xA/viewform?usp=sf_link";

// Database
export const CATEGORIES = ["ab", "bse", "certificate", "minor"];

// Registrar API
export const TERM_URL =
    "https://api.princeton.edu/registrar/course-offerings/classes/";
export const COURSE_URL =
    "https://api.princeton.edu/registrar/course-offerings/1.0.2/course-details?";
export const EVALUATION_URL =
    "https://registrarapps.princeton.edu/course-evaluation?";

export const GENERIC_GRADING_INFO: RegGradingInfo = {
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
    pu_projects: "Project(s)"
};

export const STATUS_MAP: Record<string, number> = {
    Open: 0,
    Closed: 1,
    Canceled: 2,
    Other: 3
};

// Maximum number of schedules in a term for a user
export const SCHEDULE_CAP = 10;
