import {
    fetchRegCourseDetails,
    fetchRegDepartments,
    fetchRegDeptCourses
} from "../shared/reg-fetchers";
import type { RegCourseDetails, RegDeptCourse } from "../shared/reg-types";
import { db } from "../../db/db";
import { daysToValue, formatCourseStatus, timeToValue } from "../shared/format";

//----------------------------------------------------------------------

export const formatCourseInserts = (
    course: RegDeptCourse,
    details: RegCourseDetails,
    term: number
) => {
    const courseInsert = {
        listing_id: course.course_id,
        term: term,
        code: details.crosslistings.replace(/\s/g, ""),
        title: course.title,
        status: formatCourseStatus(course),
        dists: details.distribution_area_short?.split(" or ").sort() || [],
        gradingBasis: details.grading_basis,
        hasFinal: details.grading_final_exam !== "0"
    };

    const sectionInserts = [];
    for (const section of course.classes) {
        for (const meeting of section.schedule.meetings) {
            const meetingInsert = {
                title: section.section,
                num: section.class_number,
                room: meeting.building
                    ? meeting.building.name + " " + meeting.room
                    : null,
                tot: parseInt(section.enrollment),
                cap: parseInt(section.capacity),
                days: daysToValue(meeting.days),
                start_time: timeToValue(meeting.start_time),
                end_time: timeToValue(meeting.end_time),
                status: section.pu_calc_status.toLowerCase()
            };
            sectionInserts.push(meetingInsert);
        }
    }

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
        sections: sectionInserts,
        instructors: instructorsInsert,
        courseInstructorMap: courseInstructorMapInsert
    };
};

export const handleCourse = async (course: RegDeptCourse, term: number) => {
    // Fetch details
    const details = await fetchRegCourseDetails(course.course_id, term);

    // console.log(course);
    // console.log(details);

    const inserts = formatCourseInserts(course, details, term);
    // console.log(inserts);

    // await db.transaction(async tx => {});
};

//----------------------------------------------------------------------

export const updateCourses = async (term: number) => {
    const departments: string[] = await fetchRegDepartments(term);
    for (const department of departments) {
        const startTime = Date.now();
        const courseList = await fetchRegDeptCourses(department, term);
        for (const course of courseList) await handleCourse(course, term);
        console.log(department + ": " + (Date.now() - startTime) + "ms");
    }
};

updateCourses(1254);
