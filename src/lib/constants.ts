// Database
const CATEGORIES = ["major", "certificate"];

// Registrar API
const REGISTRAR_AUTH_BEARER = "Bearer ODExNTRlNjgtZGNiOS0zYjRmLWEyMGMtYjI3ZjA5OGRlNTU0OnJlZ2lzdHJhcmFwaUBjYXJib24uc3VwZXI="; 
const TERM_URL = 'https://api.princeton.edu/registrar/course-offerings/classes/';
const COURSE_URL = 'https://api.princeton.edu/registrar/course-offerings/course-details?'
const EVALUATION_URL = "https://registrarapps.princeton.edu/course-evaluation?";

// Terms
const TERM_MAP = {
    "FALL_2023": "1242",
    "SPRING_2023": "1234",
    "FALL_2022": "1232",
    "SPRING_2022": "1224",
    "FALL_2021": "1222",
    "SPRING_2021": "1214",
    "FALL_2020": "1212",
};

const CURRENT_TERM_NAME = "FALL_2023";
const CURRENT_TERM_ID = "1242";

export { 
    CATEGORIES, 
    REGISTRAR_AUTH_BEARER, 
    TERM_URL,
    COURSE_URL,
    EVALUATION_URL,
    TERM_MAP,
    CURRENT_TERM_NAME,
    CURRENT_TERM_ID
};