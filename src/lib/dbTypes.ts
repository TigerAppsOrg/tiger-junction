type Course = {
    id: number;
    name: string;
}

type Program = {
    id: number;
    name: string;
    category: string;
}

type Requirement = {
    id: number;
    major_id: number;
    name: string;
}

type CourseRequirementAssociation = {
    course_id: number;
    subcategory_id: number;
}

export type { Course, Program, Requirement, CourseRequirementAssociation };