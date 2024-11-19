import {
    fetchRegDepartments,
    fetchRegDeptCourses
} from "../shared/reg-fetchers";

const CONCURRENCY = 3;

const updateCourses = async (term: number) => {
    const departments: string[] = await fetchRegDepartments(term);

    for (const department of departments) {
        const courseList = await fetchRegDeptCourses(department, term);
    }
};

await updateCourses(1254);
