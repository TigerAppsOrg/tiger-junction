import {
    fetchRegCourseDetails,
    fetchRegDeptCourses,
    fetchRegListings
} from "../reg-fetchers";
import { supabase } from "./shared";
import type { RegDeptCourses } from "../reg-types";

//----------------------------------------------------------------------
// Types
//----------------------------------------------------------------------

type ArrayElement<ArrayType extends readonly unknown[]> =
    ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

type RegCourse = {
    listing_id: string;
    code: string;
    dists: string[];
};

type Status = 0 | 1 | 2;

type CourseInsert = {
    id?: number;
    listing_id: string;
    title: string;
    code: string;
    term: number;
    dists: string[];
    status: Status;
    instructors: string[];
    emplids: string[];
};

type GradedCourseInsert = CourseInsert & {
    basis: string;
    has_final: boolean;
};

type SectionPartial = {
    course_id?: number;
    listing_id: string;
    num: number;
    room: string | null;
    tot: number;
    cap: number;
    days: number;
    title: string;
    category: string;
    start_time: number;
    end_time: number;
    status: Status;
    term: number;
};

type SectionInsert = {
    id?: number;
    course_id: number;
    num: number;
    room: string | null;
    tot: number;
    cap: number;
    days: number;
    title: string;
    category: string;
    start_time: number;
    end_time: number;
    status: Status;
    term: number;
};

//----------------------------------------------------------------------
// Helper Functions
//----------------------------------------------------------------------

const fetchRegCourses = async (term: number): Promise<RegCourse[]> => {
    const regListings = await fetchRegListings(term);
    const regCourses = regListings.map(x => {
        return {
            listing_id: x.course_id,
            code: x.crosslistings.replace(/\s/g, ""),
            dists: x.distribution_area
                ? x.distribution_area.split(" or ").sort()
                : []
        } as RegCourse;
    });

    return regCourses;
};

const formatCourseStatus = (course: ArrayElement<RegDeptCourses>): Status => {
    const sections = course.classes;

    let allCanceled = true;
    const sectionMap: Record<string, boolean> = {};

    for (const section of sections) {
        const sectionStatus = section.pu_calc_status;
        const sectionType = section.type_name;

        if (sectionStatus !== "Canceled") allCanceled = false;
        if (sectionStatus === "Open") sectionMap[sectionType] = true;
        else if (!sectionMap[sectionType]) sectionMap[sectionType] = false;
    }

    let status: Status = 0;
    if (allCanceled) status = 2;
    else if (Object.values(sectionMap).every(x => x)) status = 0;
    else status = 1;

    return status;
};

const formatInstructors = (
    course: ArrayElement<RegDeptCourses>
): [string[], string[]] => {
    return course.instructors
        ? [
              course.instructors.map(x => x.first_name + " " + x.last_name),
              course.instructors.map(x => x.emplid)
          ]
        : [[], []];
};

const formatRoom = (
    meeting: ArrayElement<
        ArrayElement<
            ArrayElement<RegDeptCourses>["classes"]
        >["schedule"]["meetings"]
    >
): string | null => {
    if (meeting.building && meeting.room)
        return meeting.building.name + " " + meeting.room;
    else return null;
};

const daysToValue = (days: string[]): number => {
    let value = 0;
    if (days.includes("M")) value += 1;
    if (days.includes("T")) value += 2;
    if (days.includes("W")) value += 4;
    if (days.includes("Th")) value += 8;
    if (days.includes("F")) value += 16;
    return value;
};

const timeToValue = (time: string): number => {
    const TIME_CONVERSION: Record<string, number> = {
        ZERO_ADJUST: 48,
        HOUR_FACTOR: 6,
        MINUTE_FACTOR: 0.1,
        NULL_TIME: -42
    };

    if (time === undefined) return TIME_CONVERSION.NULL_TIME;

    const dig = time
        .split(" ")[0]
        .split(":")
        .map(x => parseInt(x));
    const pm = time.split(" ")[1] === "PM" || time.split(" ")[1] === "pm";

    if (dig[0] === 12) dig[0] = 0;

    let val =
        dig[0] * TIME_CONVERSION.HOUR_FACTOR +
        dig[1] * TIME_CONVERSION.MINUTE_FACTOR -
        TIME_CONVERSION.ZERO_ADJUST;

    if (pm) val += 12 * TIME_CONVERSION.HOUR_FACTOR;

    // Round to nearest tenth (account for floating point error)
    return Math.round(val * 10) / 10;
};

const formatSectionStatus = (status: string): Status => {
    switch (status) {
        case "Open":
            return 0;
        case "Closed":
            return 1;
        default:
            return 2;
    }
};

//----------------------------------------------------------------------
// Main Function
//----------------------------------------------------------------------

/**
 * Populates the courses for a given term
 * @param term numerical term to populate the courses for
 * @param updateGrading whether to update grading information
 */
export const populateCourses = async (
    term: number,
    updateGrading: boolean = false
) => {
    let time = new Date();
    const initPromises = [
        fetchRegCourses(term),
        supabase.from("courses").select("id, listing_id").eq("term", term)
    ];

    const [regCourses, supaRes] = (await Promise.all(initPromises)) as [
        RegCourse[],
        {
            data: {
                id: number;
                listing_id: string;
            }[];
            error: Error | null;
        }
    ];

    if (supaRes.error) {
        console.error(supaRes.error);
        return;
    }

    const supaCourses = supaRes.data;
    const departments = new Set<string>();
    regCourses.forEach(x => {
        departments.add(x.code.substring(0, 3));
    });

    console.log(
        "Finished fetching courses in " +
            (new Date().getTime() - time.getTime()) +
            "ms"
    );
    time = new Date();

    const sectionPartials: SectionPartial[] = [];
    const courseInserts: (CourseInsert | GradedCourseInsert)[] = [];
    for (const dept of departments) {
        const deptData = await fetchRegDeptCourses(dept, term);
        for (const course of deptData) {
            const regCourse = regCourses.find(
                x => x.listing_id === course.course_id
            );
            if (!regCourse) {
                console.error(
                    "Course not found in regCourses:" + course.course_id
                );
                continue;
            }

            // Update Course Information
            const instructorInfo = formatInstructors(course);
            const courseData = {
                id: supaCourses.find(x => x.listing_id === course.course_id)
                    ?.id,
                listing_id: course.course_id,
                title: course.title,
                code: regCourse.code,
                term: term,
                dists: regCourse.dists,
                status: formatCourseStatus(course),
                instructors: instructorInfo[0],
                emplids: instructorInfo[1]
            } as CourseInsert;

            if (courseData.id === undefined) {
                delete courseData.id;
            }

            if (updateGrading) {
                const courseDetails = await fetchRegCourseDetails(
                    course.course_id,
                    term
                );
                const gradingBasis = courseDetails.grading_basis;
                const hasFinal =
                    courseDetails.grading_final_exam &&
                    parseInt(courseDetails.grading_final_exam) > 0
                        ? true
                        : false;

                const gradedCourseData: GradedCourseInsert = {
                    ...courseData,
                    basis: gradingBasis,
                    has_final: hasFinal
                };
                courseInserts.push(gradedCourseData);
            } else {
                courseInserts.push(courseData);
            }

            // Get Section Information
            const sections = course.classes;
            for (const section of sections) {
                for (const meeting of section.schedule.meetings) {
                    const sectionData = {
                        course_id: courseData.id,
                        listing_id: courseData.listing_id,
                        num: parseInt(section.class_number),
                        room: formatRoom(meeting),
                        tot: parseInt(section.enrollment),
                        cap: parseInt(section.capacity),
                        days: daysToValue(meeting.days),
                        title: section.section,
                        category: section.section[0],
                        start_time: timeToValue(meeting.start_time),
                        end_time: timeToValue(meeting.end_time),
                        status: formatSectionStatus(section.pu_calc_status),
                        term: term
                    } as SectionPartial;

                    sectionPartials.push(sectionData);
                }
            }
        }

        console.log(
            "Finished processing " +
                dept +
                " in " +
                (new Date().getTime() - time.getTime()) +
                "ms"
        );
        time = new Date();
    }

    const newCourses = courseInserts.filter(x => x.id === undefined);
    const existingCourses = courseInserts.filter(x => x.id !== undefined);

    // Upload courses to Supabase
    const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .upsert(existingCourses)
        .select("id,listing_id");

    if (courseError) {
        console.error(courseError);
        return;
    }

    const { data: courseDataNew, error: courseErrorNew } = await supabase
        .from("courses")
        .insert(newCourses)
        .select("id,listing_id");

    if (courseErrorNew) {
        console.error(courseErrorNew);
        return;
    }

    courseData.push(...courseDataNew);

    const { data: supaSections, error: sectionError } = await supabase
        .from("sections")
        .select("id,course_id,num,start_time,days")
        .eq("term", term);

    if (sectionError) {
        console.error(sectionError);
        return;
    }

    // Handle sections
    const sectionIdDeleteList: number[] = [];
    const sectionInserts: SectionInsert[] = [];
    for (const course of courseData) {
        const courseSections = sectionPartials.filter(
            x => x.listing_id === course.listing_id
        );

        const supaCourseSections = supaSections.filter(
            x => x.course_id === course.id
        );

        // Remove sections that no longer exist
        for (const supaSection of supaCourseSections) {
            if (!courseSections.find(x => x.num === supaSection.num)) {
                sectionIdDeleteList.push(supaSection.id);
            }
        }

        for (const newSection of courseSections) {
            const matchingSectionIndices: number[] = [];
            for (let i = 0; i < supaCourseSections.length; i++) {
                const supaSection = supaCourseSections[i];
                // All of these conditions have to be checked
                // because there are edge cases where there's a
                // section with multiple times or days, which
                // requires multiple db rows (sadly)
                const numMatch = supaSection.num === newSection.num;
                const timeMatch =
                    supaSection.start_time === newSection.start_time;
                const dayMatch = supaSection.days === newSection.days;
                if (numMatch && timeMatch && dayMatch) {
                    matchingSectionIndices.push(i);
                }
            }

            // There was previously a bug that caused duplicate sections
            // to be created. This code will delete all but the first
            // matching section (which will be found by the next block)
            if (matchingSectionIndices.length > 1) {
                console.error(
                    "Multiple sections found for " +
                        newSection.listing_id +
                        " " +
                        newSection.num
                );
                const extraSections = matchingSectionIndices.slice(1);
                sectionIdDeleteList.push(
                    ...extraSections.map(x => supaCourseSections[x].id)
                );
            }

            // Find matching section to ensure no duplicates
            const matchingSectionIndex = supaCourseSections.findIndex(
                x => x.num === newSection.num
            );
            const matchingSection =
                matchingSectionIndex !== -1
                    ? supaCourseSections[matchingSectionIndex]
                    : null;

            supaCourseSections.splice(matchingSectionIndex, 1);

            const sectionInsert: SectionInsert = {
                course_id: course.id,
                num: newSection.num,
                room: newSection.room,
                tot: newSection.tot,
                cap: newSection.cap,
                days: newSection.days,
                title: newSection.title,
                category: newSection.category,
                start_time: newSection.start_time,
                end_time: newSection.end_time,
                status: newSection.status,
                term: newSection.term
            };

            if (matchingSection) {
                sectionInsert.id = matchingSection.id;
            }

            sectionInserts.push(sectionInsert);
        }
    }

    const newSections = sectionInserts.filter(x => x.id === undefined);
    const existingSections = sectionInserts.filter(x => x.id !== undefined);

    // Upload sections to Supabase
    const { error: sectionUpdateError } = await supabase
        .from("sections")
        .upsert(existingSections);

    if (sectionUpdateError) {
        console.error(sectionUpdateError);
        return;
    }

    const { error: newSectionError } = await supabase
        .from("sections")
        .insert(newSections);

    if (newSectionError) {
        console.error(newSectionError);
        return;
    }

    // Delete sections that no longer exist
    const { error: sectionDeleteError } = await supabase
        .from("sections")
        .delete()
        .in("id", sectionIdDeleteList);

    if (sectionDeleteError) {
        console.error(sectionDeleteError);
        return;
    }

    console.log(
        "Finished uploading to Supabase in " +
            (new Date().getTime() - time.getTime()) +
            "ms"
    );
};
