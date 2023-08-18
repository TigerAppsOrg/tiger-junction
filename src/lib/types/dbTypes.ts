// Types relating to database fetching and insertion

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
    course_info: Record<string, string | RegSeatReservation>,
    is_open: boolean,
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

export type { Listing, CourseInsert, Course, InstructorInsert, CourseInstructorAssociation };