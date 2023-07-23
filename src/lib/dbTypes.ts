type CourseSU = {
    id: number;
    name: string;
    terms: string[];
}

type CourseBASIC = {
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

export type { 
    CourseSU, 
    CourseBASIC, 
    Program, 
    Requirement, 
    CourseRequirementAssociation 
};