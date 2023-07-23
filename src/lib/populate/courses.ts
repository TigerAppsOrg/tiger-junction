import { REGISTRAR_AUTH_BEARER, TERM_URL } from "$lib/constants"
import type { CourseBASIC } from "$lib/dbTypes";

/**
 * Gets and formats the courses for the given term
 * @param term 
 * @returns Course[] for the given term
 */
const scrapeCourses = async (term: string) => {
    const res = await fetch(TERM_URL + term, {
        headers: { Authorization: REGISTRAR_AUTH_BEARER }
    });

    const data = await res.json();
    return removeDuplicateCourses(formatCourses(data.classes.class, term));
}

// Format courses to Course[] and remove closed courses
const formatCourses = (rawCourses: any[], term: string) => {
    let courses: CourseBASIC[] = [];

    for (let i = 0; i < rawCourses.length; i++) {
        let ele = rawCourses[i];
        if (ele.calculated_status === "Canceled") continue;

        let id = parseInt(ele.course_id);
        let name = ele.crosslistings.replace(/\s/g, "") + " " + ele.long_title;
        if (ele.topic_title) name += ": " + ele.topic_title;
        courses.push({ id, name });
    }
    return courses;
}

// Remove duplicate courses
const removeDuplicateCourses = (courses: CourseBASIC[]) => {
    let ids = new Set<number>();
    let res: CourseBASIC[] = [];

    for (let i = 0; i < courses.length; i++) {
        let ele = courses[i];
        if (!ids.has(ele.id)) {
            ids.add(ele.id);
            res.push(ele);
        }
    }
    return res;
}

export { scrapeCourses };