import { sectionData } from "$lib/stores/rsections";
import { currentTerm } from "$lib/changeme";
import type { CourseData } from "$lib/types/dbTypes";
import { get } from "svelte/store";
import { valueToDays } from "../convert";

/**
 * Check if there is any conflict in the given list of time
 * @param conflictList map of day (1-5) to list of [start, end] time
 * @returns false if, for every section type, there is a 
 * section that does not conflict and true otherwise
 */
export const doesConflict = (course: CourseData, 
conflictList: Record<number, [number, number][]>, 
onlyAvailable: boolean): boolean => {

    // Get sections of the course
    const sections = get(sectionData)[get(currentTerm)][course.id];
    if (sections === undefined) {
        return false;
    }

    // Separate into section categories (Category -> Title -> Data[])
    // Data[] = [days, start_time, end_time, status]
    const sectionMap: Record<string, Record<string, [number, number, number, number][]>> = {};
    sections.forEach(x => {
        if (!sectionMap[x.category]) sectionMap[x.category] = {};
        if (!sectionMap[x.category][x.title]) sectionMap[x.category][x.title] = [];
        sectionMap[x.category][x.title].push([x.days, x.start_time, x.end_time, x.status]);
    });

    // Check if there is a nonconflicting section for each category
    o: for (const sectionList of Object.values(sectionMap)) {
            for (const section of Object.values(sectionList))
                if (!doesSectionConflict(section, conflictList) 
                && (!onlyAvailable || isSectionAvailable(section))) 
                    continue o;
            return true;
    }
    return false;
}

// Check if a section is open (and handle edge cases)
const isSectionAvailable = (sectionInfo: [number, number, number, number][]) => {
    for (const x of sectionInfo) {
        if (x[3] === 0) return true;
    }
    return false;
}

// Check if a section conflicts with the conflict list
const doesSectionConflict = (sectionInfo: [number, number, number, number][], 
conflictList: Record<number, [number, number][]>): boolean => {

    for (const [day_inf, start_time, end_time] of sectionInfo) {
        const days = valueToDays(day_inf);
        for (const day of days) {
            for (const [start, end] of conflictList[day]) {
                if (start_time < end && end_time > start) {
                    return true;
                }
            }
        }
    }

    return false;
}   