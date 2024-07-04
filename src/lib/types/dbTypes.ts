// Types relating to database fetching and insertion

import type { SectionData } from "$lib/stores/rsections";
import type { CalColors } from "$lib/stores/styles";

export type Listing = {
    id: string;
    code: string;
    title: string;
    aka: string[] | null;
    ult_term: number;
    pen_term: number | null;
};

export type CourseInsert = {
    id?: number;
    listing_id: string;
    term: number;
    code: string;
    title: string;
    status: number;
    dists: string[] | null;
    instructors: string[] | null;
    basis?: string;
    has_final?: boolean;
};

export type Course = CourseInsert & {
    id: number;
    rating: number | null;
};

export type InstructorInsert = {
    netid: string;
    name: string;
};

export type CourseInstructorAssociation = {
    course_id: number;
    instructor_id: string;
};

export type DualId = {
    listing_id: string;
    id: number;
};

export type CourseData = {
    has_final: any;
    id: number;
    listing_id: string;
    term: number;
    code: string;
    title: string;
    status: number;
    basis: string;
    dists: string[];
    rating: number;
    num_evals: number;
    adj_rating: number;
    instructors: string[] | null;
};

export type CourseLinks = {
    registrar: string;
    tigersnatch: string;
    princetoncourses: string;
};

export type CalBoxParam = {
    courseCode: string;
    section: SectionData;
    color: keyof CalColors;
    confirmed: boolean;
    day: number;
    slot: number;
    maxSlot: number;
    colSpan: number;
    height: string;
    width: string;
    top: string;
    left: string;
};

export type CalendarBox = {
    courseCode: string;
    section: SectionData;
    style: string;
};
