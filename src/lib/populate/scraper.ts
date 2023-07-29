import { REGISTRAR_AUTH_BEARER, TERM_URL, COURSE_URL, EVALUATION_URL } from "$lib/constants";
import { PRIVATE_COOKIE } from "$env/static/private"
import { JSDOM } from "jsdom";

/**
 * Retrieves array of all classes for a given term number.
 * @param {string} termId - The term number to retrieve classes for.
 * @returns {any[]} - Array of all course info for a given term number.
 */
export const getAllCourses = async (termId: string) => {
    const res = await fetch(`${TERM_URL}${termId}`, {
        method: "GET",
        headers: {
            "Authorization": REGISTRAR_AUTH_BEARER
        }
    });

    const data = await res.json();
    return data.classes.class;
}

export const getCourseData = async (courseId: string, termId: string) => {
    const res = await fetch(
        `${COURSE_URL}term=${termId}&courseid=${courseId}`, {
            method: "GET",
            headers: {
                "Authorization": REGISTRAR_AUTH_BEARER
            }
        }
    );
}

/**
 * Fetches and formats course evaluation data for a given course and term.
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

export { getCourseEvaluation };