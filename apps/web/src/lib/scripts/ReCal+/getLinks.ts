import type { CourseData, CourseLinks } from "$lib/types/dbTypes";

/**
 * Get links to registrar, tigersnatch, and princetoncourses
 * @param course
 * @returns object containing links to registrar, tigersnatch, and princetoncourses
 */
const getLinks = (course: CourseData): CourseLinks => {
    const REGISTRAR =
        "https://registrar.princeton.edu/course-offerings/course-details?term=";
    const TIGERSNATCH = "https://tigersnatch.com/course?courseid=";
    const PRINCETONCOURSES = "https://www.princetoncourses.com/course/";

    return {
        registrar: REGISTRAR + course.term + "&courseid=" + course.listing_id,
        tigersnatch: TIGERSNATCH + course.listing_id + "&skip&ref=recalplus",
        princetoncourses: PRINCETONCOURSES + course.term + course.listing_id
    };
};

export { getLinks };
