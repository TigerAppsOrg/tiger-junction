import type { RegGradingInfo } from "./types/regTypes";

// Database
const CATEGORIES = ["ab", "bse", "certificate", "minor"];

// Registrar API
const REGISTRAR_AUTH_BEARER = "Bearer NjdiN2YzNjYtMWQ3Ny0zZTgwLTkyZGQtNTM2MDZmMGQ1YWMwOnJlZ2lzdHJhcmFwaUBjYXJib24uc3VwZXI="; 
const TERM_URL = 'https://api.princeton.edu/registrar/course-offerings/classes/';
const COURSE_URL = 'https://api.princeton.edu/registrar/course-offerings/1.0.1/course-details?'
const EVALUATION_URL = "https://registrarapps.princeton.edu/course-evaluation?";

// Terms
const TERM_MAP: Record<string, number> = {
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

const CURRENT_TERM_NAME = "FALL_2023";
const CURRENT_TERM_ID = 1242;

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

export { 
    CATEGORIES, 
    REGISTRAR_AUTH_BEARER, 
    TERM_URL,
    COURSE_URL,
    EVALUATION_URL,
    TERM_MAP,
    CURRENT_TERM_NAME,
    CURRENT_TERM_ID,
    GENERIC_GRADING_INFO
};