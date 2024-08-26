import {
    fetchRegCourseDetails,
    fetchRegDeptCourses,
    fetchRegListings
} from "./fetchers";
import { supabase } from "./shared";
import type { RegDeptCourses } from "./types";

type ArrayElement<ArrayType extends readonly unknown[]> =
    ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

type RegCourse = {
    listing_id: string;
    code: string;
    dists: string[];
};

type CourseInsert = {
    id?: number;
    listing_id: string;
    title: string;
    code: string;
    term: number;
    dists: string[];
    status: 0 | 1 | 2;
    instructors: string[];
    emplids: string[];
};

type SectionInsert = {};

type GradedCourseInsert = CourseInsert & {
    basis: string;
    has_final: boolean;
};

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

const formatStatus = (course: ArrayElement<RegDeptCourses>): 0 | 1 | 2 => {
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

    let status: 0 | 1 | 2 = 0;
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

            // Course Information
            const instructorInfo = formatInstructors(course);
            const courseData = {
                listing_id: course.course_id,
                title: course.title,
                code: regCourse.code,
                term: term,
                dists: regCourse.dists,
                status: formatStatus(course),
                instructors: instructorInfo[0],
                emplids: instructorInfo[1]
            } as CourseInsert;

            const supaCourse = supaCourses.find(
                x => x.listing_id === course.course_id
            );
            if (supaCourse) {
                courseData.id = supaCourse.id;
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
                console.log(gradedCourseData);
                courseInserts.push(gradedCourseData);
            } else {
                courseInserts.push(courseData);
            }

            // Section Information
        }
    }
};

console.log(await populateCourses(1252, true));
