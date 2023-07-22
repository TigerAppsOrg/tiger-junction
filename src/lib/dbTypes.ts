type Course = {
    id: number;
    name: string;
}

type Category = {
    id: number;
    name: string;
    type: string;
}

type Subcategory = {
    id: number;
    major_id: number;
    name: string;
}

type CourseSubcategoryAssociation = {
    course_id: number;
    subcategory_id: number;
}

export type { Course, Category, Subcategory, CourseSubcategoryAssociation };