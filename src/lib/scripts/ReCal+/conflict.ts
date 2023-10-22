import { currentTerm } from "$lib/stores/recal";
import { sectionData, type SectionData } from "$lib/stores/rsections";
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

    // Separate into section categories
    const sectionMap: Record<string, typeof sections> = {};
    sections.forEach(x => {
        if (!sectionMap[x.category]) sectionMap[x.category] = [];
        sectionMap[x.category].push(x);
    });

    // Check if there is a nonconflicting section for each category
    o: for (const sectionList of Object.values(sectionMap)) {
            for (const section of sectionList) 
                if (!doesSectionConflict(section, conflictList) 
                && (!onlyAvailable || section.status === 0)) 
                    continue o;
            return true;
    }
    return false;
}

// Check if a section conflicts with the conflict list
const doesSectionConflict = (section: SectionData, 
conflictList: Record<number, [number, number][]>): boolean => {
    const days = valueToDays(section.days);
    for (const day of days) {
        for (const [start, end] of conflictList[day]) {
            if (section.start_time < end && section.end_time > start) {
                return true;
            }
        }
    }
    return false;
}   