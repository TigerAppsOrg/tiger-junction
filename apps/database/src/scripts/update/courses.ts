import {
    fetchRegCourseDetails,
    fetchRegDepartments,
    fetchRegDeptCourses
} from "../shared/reg-fetchers";
import type { RegCourseDetails, RegDeptCourse } from "../shared/reg-types";
import { db } from "../../db/db";

//----------------------------------------------------------------------

const formatCourseInserts = (
    course: RegDeptCourse,
    details: RegCourseDetails,
    term: number
) => {
    const courseInsert = {
        listing_id: course.course_id,
        term: term,
        code: course.crosslistings,
        title: course.title,
        status: "",
        dists: [],
        gradingBasis: "",
        hasFinal: false
    };

    const sectionsInsert = {
        title: "",
        num: 0,
        room: null,
        tot: 0,
        cap: 0,
        days: 0,
        start_time: 0,
        end_time: 0,
        status: ""
    };

    const instructorsInsert = course.instructors.map(instructor => {
        return {
            emplid: instructor.emplid,
            name: instructor.full_name
        };
    });

    const courseInstructorMapInsert = instructorsInsert.map(instructor => {
        return {
            course_id: course.course_id,
            instructor_id: instructor.emplid
        };
    });

    return {
        course: courseInsert,
        sections: sectionsInsert,
        instructors: instructorsInsert,
        courseInstructorMap: courseInstructorMapInsert
    };
};

const handleCourse = async (course: RegDeptCourse, term: number) => {
    // Fetch details
    const details = await fetchRegCourseDetails(course.course_id, term);

    console.log(course);
    console.log(details);

    const inserts = formatCourseInserts(course, details, term);

    await db.transaction(async tx => {});
};

//----------------------------------------------------------------------

const updateCourses = async (term: number) => {
    const departments: string[] = await fetchRegDepartments(term);
    for (const department of departments) {
        const startTime = Date.now();
        const courseList = await fetchRegDeptCourses(department, term);
        for (const course of [courseList[0]]) await handleCourse(course, term);
        console.log(department + ": " + (Date.now() - startTime) + "ms");
        return;
    }
};

updateCourses(1254);
