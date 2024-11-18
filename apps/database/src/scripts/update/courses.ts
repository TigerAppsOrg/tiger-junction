import { fetchRegDepartments } from "../shared/reg-fetchers";

const updateCourses = async (term: number) => {
    const departments = await fetchRegDepartments(term);

    // For each department
    // Fetch courses -> Fetch course details
    //
};

await updateCourses(1254);
