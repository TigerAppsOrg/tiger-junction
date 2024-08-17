// Types relating to database fetching and insertion

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
    has_final: boolean;
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
