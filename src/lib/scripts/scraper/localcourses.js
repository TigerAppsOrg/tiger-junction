/**
 * @fileoverview Scraper for updating ONLY enrollment data rapidly.
 * Meant to be run on a local machine during extremely critical times
 * (e.g. during registration period, start of add-drop) where the
 * enrollment numbers need to be updated every minute (or faster).
 */

import { COURSE_URL, TERM_URL } from "$lib/constants";
import { getToken } from "./getToken"

/**
 * Updates the enrollment numbers for all courses in the Redis database 
 * for the given term.
 * @param {any} supabase 
 * @param {number} term 
 */
export const updateEnrollments = async(supabase, term) => {
    // Get course list from registrar
    const token = await getToken();
    const rawCourseList = await fetch(`${TERM_URL}${term}`, {
        method: "GET",
        headers: {
            "Authorization": token
        }
    });

    // Calculate status
    const jsonCourseList = await rawCourseList.json();
    let courseList = jsonCourseList.classes.class.map(
    (/** @type {{ course_id: number; calculated_status: string; }} */ x) => {
        return {
            id: x.course_id,
            status: calculateStatus(x.calculated_status)
        }
    });

    // Remove duplicates
    /**
     * @type {number[]}
     */
    let ids = [];
    /**
     * @type {{ id: number; status: number; }[]}
     */
    let newCourses = [];
    for (let course of courseList) {
        if (!ids.includes(course.id)) {
            ids.push(course.id);
            newCourses.push(course);
        }
    }
    courseList = newCourses;

    let count = 0;

    /**
     * Process the course at the given index.
     * @param {number} index 
     */
    const processCourse = async (index) => {
        // Check base case
        if (index >= courseList.length) return;
        count++;

        // Get specific course data
        const resRaw = await fetch(
            `${COURSE_URL}term=${term}&course_id=${newCourses[index].id}`, {
                method: "GET",
                headers: {
                    "Authorization": token
                }
            }
        );
        const res = await resRaw.json();

        if (!res || !res.course_details || !res.course_details.course_detail
        || res.course_details.course_detail.length === 0) {
            console.error("Error fetching course data: " + index);
            return;
        }

        // Format Course Data
        const data = res.course_details.course_detail[0];
        const course = {
            
        }
    }
}

/**
 * Convert to numberic status for course.
 * @param {string} status 
 * @returns {number}
 */
const calculateStatus = (status) => {
    switch (status) {
        case "Open":
            return 0;
        case "Closed":
            return 1;
        case "Canceled":
            return 2;
        default:
            return 3;
    }
}