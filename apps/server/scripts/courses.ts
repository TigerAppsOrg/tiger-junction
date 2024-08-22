import { getToken, TERM_URL } from "./shared";

type RegCourse = {
  listing_id: string;
  code: string;
  dists: string[];
};

const fetchRegCourses = async (term: number): Promise<RegCourse[]> => {
  const token = await getToken();
  const rawCourseList = await fetch(`${TERM_URL}${term}`, {
    method: "GET",
    headers: {
      Authorization: token,
    },
  });
  const jsonCourseList: any = await rawCourseList.json();

  const valid =
    jsonCourseList &&
    Object.prototype.hasOwnProperty.call(jsonCourseList, "classes") &&
    Object.prototype.hasOwnProperty.call(jsonCourseList.classes, "class") &&
    Array.isArray(jsonCourseList.classes.class);

  if (!valid) {
    throw new Error("Invalid course list response format");
  }

  const regCourses = jsonCourseList.classes.class.map((x: any) => {
    return {
      listing_id: x.course_id,
      code: x.crosslistings.replace(/\s/g, ""),
      dists: x.distribution_area
        ? x.distribution_area.split(" or ").sort()
        : [],
    } as RegCourse;
  });

  // Remove duplicates
  const seenIds = new Set<string>();
  const uniqueRegCourses = regCourses.filter((x: RegCourse) => {
    if (seenIds.has(x.listing_id)) {
      return false;
    }
    seenIds.add(x.listing_id);
    return true;
  });

  return uniqueRegCourses;
};

const populateCourses = async (term: number) => {
  console.log(await fetchRegCourses(term));
};

populateCourses(1252);
