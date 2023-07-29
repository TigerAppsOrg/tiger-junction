type Course = {
    id: number;
    name: string;
    term: string;
    registrar_id: string;
}

type CoursePartial = {
    name: string;
    term: string;
    registrar_id: string;
}

type Program = {
    id: number;
    name: string;
    category: string;
}

type Requirement = {
    id: number;
    group_id: number;
    name: string;
}

type CourseRequirementAssociation = {
    course_id: number;
    subcategory_id: number;
}

type ProgramInput = {
    name: string;
    category: string;
    link: string;
    ind_work: boolean;
    requirement_groups: RequirementGroup[]; 
}

type RequirementGroup = {
    name: string;
    requirements: RequirementPartial[];
}

type RequirementPartial = {
    name: string;
    count: number;
    courses: string[];
}


export type { 
    Course, 
    CoursePartial,
    Program, 
    Requirement, 
    CourseRequirementAssociation,
    ProgramInput,
    RequirementGroup,
    RequirementPartial
};