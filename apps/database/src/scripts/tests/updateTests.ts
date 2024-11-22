import {
    fetchRegCourseDetails,
    fetchRegDepartments,
    fetchRegDeptCourses
} from "../shared/reg-fetchers";
import { formatCourseInserts } from "../update/courses";
import { assert } from "./shared";

// Ensure course data is formatted correctly before inserting into database
const testCourseData = async () => {
    console.log("This test may take a while to run...");
    const TERM = 1254; // Spring 2025

    const departments: string[] = await fetchRegDepartments(TERM);

    let passed = true;
    const uniqueListingIds = new Set();

    for (const department of departments) {
        const courseList = await fetchRegDeptCourses(department, TERM);
        for (const course of courseList) {
            const details = await fetchRegCourseDetails(course.course_id, TERM);
            const inserts = formatCourseInserts(course, details, TERM);

            //----------------------------------------------------------
            // Validate course insert data
            //----------------------------------------------------------

            // courses
            passed = assert(
                !uniqueListingIds.has(inserts.course.listing_id),
                `Duplicate course ID: ${inserts.course.listing_id}`
            );
            uniqueListingIds.add(inserts.course.listing_id);

            // sections
            passed = assert(
                inserts.sections.every(section =>
                    ["open", "closed", "canceled"].includes(section.status)
                ),
                `${course.course_id}: Invalid section status -- ${inserts.sections.map(
                    x => {
                        return x.status;
                    }
                )}`
            );

            passed = assert(
                inserts.sections.every(
                    section => section.end_time >= section.start_time
                ),
                `${course.course_id}: Section end time is before start time`
            );

            passed = assert(
                inserts.sections.every(section => section.cap >= 0),
                `${course.course_id}: Section capacity is negative`
            );

            passed = assert(
                inserts.sections.every(section => section.tot >= 0),
                `${course.course_id}: Section enrollment is negative`
            );

            passed = assert(
                inserts.sections.every(
                    section => typeof section.num === "string"
                ),
                `${course.course_id}: Section number is not a string`
            );

            // instructors
            passed = assert(
                Array.isArray(inserts.instructors),
                `${course.course_id}: instructors is not an array`
            );

            // courseInstructorMap
            passed = assert(
                Array.isArray(inserts.courseInstructorMap),
                `${course.course_id}: courseInstructorMap is not an array`
            );
        }
        console.log(`Finished testing ${department}`);
    }

    return passed;
};

export const updateTests = {
    "Format Course Data": testCourseData
};
