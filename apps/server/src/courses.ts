import { fetchRegListings } from "./fetchers";

type RegCourse = {
    listing_id: string;
    code: string;
    dists: string[];
};

const fetchRegCourses = async (term: number): Promise<RegCourse[]> => {
    const regListings = await fetchRegListings(term);
    const regCourses = regListings.map(x => {
        return {
            listing_id: x.course_id,
            code: x.crosslistings.replace(/\s/g, ""),
            dists: x.distribution_area
                ? x.distribution_area.split(" or ").sort()
                : []
        } as RegCourse;
    });

    return regCourses;
};

const populateCourses = async (term: number) => {
    console.log(await fetchRegCourses(term));
};

console.log(await fetchRegCourses(1252));
