import type { CourseData } from "$lib/types/dbTypes";

/**
 * Check if there is any conflict in the given list of time
 * @param conflictList map of day (1-5) to list of [start, end] time
 * @returns false if, for every section type, there is a 
 * section that does not conflict and true otherwise
 */
export const doesConflict = (course: CourseData, 
conflictList: Record<number, [number, number][]>): boolean => {
    return true;
}