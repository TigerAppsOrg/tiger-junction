import { eq } from "drizzle-orm";
import { db } from "../../db/db";
import * as schema from "../../db/schema";
import { Status } from "../shared/db-types";
import { daysToValue, formatCourseStatus, timeToValue } from "../shared/format";
import {
    fetchRegCourseDetails,
    fetchRegDepartments,
    fetchRegDeptCourses
} from "../shared/reg-fetchers";
import type { RegCourseDetails, RegDeptCourse } from "../shared/reg-types";

//----------------------------------------------------------------------

// Convert registrar format to database format
export const formatCourseInserts = (
    course: RegDeptCourse,
    details: RegCourseDetails,
    term: number
) => {
    const courseInsert = {
        listingId: course.course_id,
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
                startTime: timeToValue(meeting.start_time),
                endTime: timeToValue(meeting.end_time),
                status: section.pu_calc_status.toLowerCase() as Status
            };

            // Ensure status is valid
            if (
                !["open", "closed", "canceled"].includes(meetingInsert.status)
            ) {
                console.error(
                    "Unknown section status: " +
                        meetingInsert.status +
                        " for " +
                        courseInsert.listingId +
                        " " +
                        meetingInsert.title
                );
            }

            sectionInserts.push(meetingInsert);
        }
    }

    const instructorsInsert = course.instructors.map(instructor => {
        return {
            emplid: instructor.emplid,
            name: instructor.full_name
        };
    });

    return {
        course: courseInsert,
        sections: sectionInserts,
        instructors: instructorsInsert
    };
};

//----------------------------------------------------------------------

// Fetch course details, format inserts, and insert into database
export const handleCourse = async (course: RegDeptCourse, term: number) => {
    // Fetch details
    const details = await fetchRegCourseDetails(course.course_id, term);
    const inserts = formatCourseInserts(course, details, term);

    // Insert course and related data to database
    await db.transaction(async tx => {
        // Upsert course and get id
        const courseRes = await tx
            .insert(schema.courses)
            .values(inserts.course)
            .onConflictDoUpdate({
                target: [schema.courses.listingId, schema.courses.term],
                set: {
                    code: inserts.course.code,
                    title: inserts.course.title,
                    status: inserts.course.status,
                    dists: inserts.course.dists,
                    gradingBasis: inserts.course.gradingBasis,
                    hasFinal: inserts.course.hasFinal
                }
            })
            .returning({
                id: schema.courses.id
            });

        if (courseRes.length !== 1) {
            throw new Error("Course upsert failed");
        }
        const courseId = courseRes[0].id;

        // Delete old course-instructor mappings
        await tx
            .delete(schema.courseInstructorMap)
            .where(eq(schema.courseInstructorMap.courseId, courseId));

        // Insert instructors and course-instructor mappings
        for (const instructor of inserts.instructors) {
            await tx
                .insert(schema.instructors)
                .values(instructor)
                .onConflictDoNothing();
            await tx.insert(schema.courseInstructorMap).values({
                courseId: courseId,
                instructorId: instructor.emplid
            });
        }

        // Delete old sections
        await tx
            .delete(schema.sections)
            .where(eq(schema.sections.courseId, courseId));

        // Insert sections
        for (const section of inserts.sections) {
            await tx.insert(schema.sections).values({
                courseId: courseId,
                ...section
            });
        }
    });
};

//----------------------------------------------------------------------

// Update all courses for a given term
export const updateCourses = async (term: number) => {
    const departments: string[] = await fetchRegDepartments(term);
    for (const department of departments) {
        const startTime = Date.now();
        const courseList = await fetchRegDeptCourses(department, term);
        for (const course of courseList) await handleCourse(course, term);
        console.log(department + ": " + (Date.now() - startTime) + "ms");
    }
};

const isMainModule = process.argv[1] === import.meta.url.slice(7);
if (isMainModule) {
    console.log("Updating courses for term 1254");
    updateCourses(1254);
}
