import { REGISTRAR_AUTH_BEARER, TERM_URL, COURSE_URL, EVALUATION_URL } from "$lib/constants";
import { PRIVATE_COOKIE } from "$env/static/private"
import { JSDOM } from "jsdom";

//----------------------------------------------------------------------
// Courses
//----------------------------------------------------------------------

/**
 * Retrieves array of all classes for a given term number.
 * @param {string} termId - The term number to retrieve classes for.
 * @returns {any[]} - Array of all course info for a given term number.
 */
const getAllCourses = async (termId: string) => {
    const res = await fetch(`${TERM_URL}${termId}`, {
        method: "GET",
        headers: {
            "Authorization": REGISTRAR_AUTH_BEARER
        }
    });

    const data = await res.json();
    return data.classes.class;
}

const getCourseData = async (courseId: string, termId: string) => {
    const res = await fetch(
        `${COURSE_URL}term=${termId}&courseid=${courseId}`, {
            method: "GET",
            headers: {
                "Authorization": REGISTRAR_AUTH_BEARER
            }
        }
    );

    const raw = await res.json();
    const course = raw.course_details.course_detail;

    let returnDict: Record<string, any> = {};

    returnDict["reg"] = course.course_id;
    returnDict["term"] = termId;
    returnDict["code"] = course.crosslistings;
    returnDict["title"] = course.topic_title === null ? 
                                course.long_title : 
                                course.long_title + ": " + course.topic_title;
    returnDict["description"] = course.description;
    returnDict["assignments"] = course.reading_writing_assignment;
    returnDict["open"] = course.calculated_status
    returnDict["basis"] = course.grading_basis;
    returnDict["dists"] = course.distribution_area_short.split(" or ");

    let instructors = course.course_instructors.course_instructor
}

const getCourseIds = async (termId: string) => {
    const res = await fetch(`${TERM_URL}${termId}`, {
        method: "GET",
        headers: {
            "Authorization": REGISTRAR_AUTH_BEARER
        }
    });

    const data = await res.json();
    const courses = data.classes.class;
    return courses.map((x: any) => x.course_id);
}

//----------------------------------------------------------------------
// Course Evaluation
//----------------------------------------------------------------------

/**
 * Fetch and format course evaluation data for a given course and term.
 * @param courseId 
 * @param termId 
 * @returns formatted course evaluation data
 */
const getCourseEvaluation = async (courseId: string, termId: string) => {
    const res = await fetch(
        `${EVALUATION_URL}courseinfo=${courseId}&terminfo=${termId}`, {
            method: "GET",
            headers: {
                "Cookie": PRIVATE_COOKIE
            }
        }
    );

    const dom = new JSDOM(await res.text());

    if (dom.window.document.querySelectorAll("tr").length === 0) return null;
    
    const evalLabels = dom.window.document.querySelectorAll("tr")[0].querySelectorAll("th");
    const evalRatings = dom.window.document.querySelectorAll("tr")[1].querySelectorAll("td");
    const comments = dom.window.document.querySelectorAll(".comment");

    let returnDict: Record<string, any> = {};
    for (let i = 0; i < evalLabels.length; i++) {
        returnDict[evalLabels[i].textContent as string] = evalRatings[i].textContent;
        returnDict["comments"] = [...comments].map(x => x.textContent);
    }
    return returnDict;
}

/**
 * Fetch and format course evaluation data for each course in courseIds.
 * @param courseIds 
 * @param termId 
 * @returns array of course evaluation data for each course in courseIds
 */
const getAllCourseEvaluations = async (courseIds: string[], termId: string) => {
    let returnArr = [];
    for (let i = 0; i < 20; i++) 
        returnArr.push(await getCourseEvaluation(courseIds[i], termId));
    
    return returnArr;
}

export { 
    getAllCourses,
    getCourseData,
    getCourseIds, 
    getCourseEvaluation, 
    getAllCourseEvaluations 
};