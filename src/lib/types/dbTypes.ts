// Types relating to database fetching and insertion

import type { SectionData } from "$lib/stores/rsections"
import type { RegSeatReservation } from "./regTypes"

type Listing = {
    id: string,
    code: string,
    title: string,
    aka: string[] | null,
    ult_term: number,
    pen_term: number | null
}

type CourseInsert = {
    listing_id: string,
    term: number,
    code: string,
    title: string,
    grading_info: Record<string, string>,
    // course_info: Record<string, string | RegSeatReservation[]>,
    // reading_info: Record<string, string> | null,
    status: number,
    basis: string,
    dists: string[] | null,
}

type Course = CourseInsert & {
    id: number,
    rating: number | null,
}

type InstructorInsert = {
    netid: string,
    name: string,
}

type CourseInstructorAssociation = {
    course_id: number,
    instructor_id: string,
}

type DualId = {
    listing_id: string,
    id: number
}

type CourseData = {
    id: number,
    listing_id: string,
    term: number,
    code: string,
    title: string,
    status: number,
    basis: string,
    dists: string[],
    rating: number,
    grading_info: Record<string, string>,
}

type RawCourseData = {
    1242: CourseData[] 
    1234: CourseData[] 
    1232: CourseData[]
}

type CourseLinks = {
    registrar: string,
    tigersnatch: string,
    princetoncourses: string,
}

type CalBoxParam = {
    courseCode: string;
    section: SectionData;
    color: number;
    confirmed: boolean;
    preview?: boolean;
    day: number;
}

type CalendarBox = {
    courseCode: string;
    section: SectionData;
    style: string;
}

export type { 
    Listing, 
    CourseInsert, 
    Course, 
    InstructorInsert, 
    CourseInstructorAssociation,
    DualId,
    CourseData,
    RawCourseData,
    CourseLinks,
    CalBoxParam,
    CalendarBox
};