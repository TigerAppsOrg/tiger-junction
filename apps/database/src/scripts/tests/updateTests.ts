import {
    fetchRegCourseDetails,
    fetchRegDepartments,
    fetchRegDeptCourses
} from "../shared/reg-fetchers";
import { formatCourseInserts } from "../update/courses";
import { assert } from "./shared";

// Ensure course data is formatted correctly before inserting into database
const testCourseData = async () => {
    const TERM = 1254; // Spring 2025

    const departments: string[] = await fetchRegDepartments(TERM);

    for (const department of departments) {
        const courseList = await fetchRegDeptCourses(department, TERM);
        for (const course of courseList) {
            const details = await fetchRegCourseDetails(course.course_id, TERM);
            const inserts = formatCourseInserts(course, details, TERM);

            // Validate course insert data
        }
    }
};

export const updateTests = {
    "Format Course Data": testCourseData
};
