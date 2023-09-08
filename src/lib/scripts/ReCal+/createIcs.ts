import * as ics from "ics";
import { currentSchedule, currentTerm } from "$lib/stores/recal";
import { savedCourses } from "$lib/stores/rpool";
import { get } from "svelte/store";
import { sectionData } from "$lib/stores/rsections";

/**
 * Creates an ICS file from the current schedule and saved courses.
 */
const createIcs = () => {
    const courses = get(savedCourses)[get(currentSchedule)];
    const sections = get(sectionData)[get(currentTerm)];

    let events = [];
    for (let i = 0; i < courses.length; i++) {
        
    }
}

export { createIcs }