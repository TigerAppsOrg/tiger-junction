import { getToken, TERM_URL } from "./shared";
import type { RegListings } from "./types";

export const fetchRegListings = async (term: number): Promise<RegListings> => {
  const token = await getToken();

  const rawCourseList = await fetch(`${TERM_URL}${term}`, {
    method: "GET",
    headers: {
      Authorization: token,
    },
  });

  const courseList: any = await rawCourseList.json();

  const valid =
    courseList &&
    courseList.classes &&
    courseList.classes.class &&
    Array.isArray(courseList.classes.class);

  if (!valid) {
    throw new Error("Invalid course list response format");
  }

  const regListings = courseList.classes.class as RegListings;

  // Remove duplicates
  const seenIds = new Set<string>();
  const uniqueRegListings = regListings.filter((x) => {
    if (seenIds.has(x.course_id)) {
      return false;
    }
    seenIds.add(x.course_id);
    return true;
  });

  return uniqueRegListings;
};

/**
 * Fetch all courses for a department in a given term
 * @param dept Department code
 * @param term Term code
 * @returns
 */
export const fetchRegDeptCourses = async (dept: string, term: number) => {
  const token = process.env.API_ACCESS_TOKEN;
  if (!token) {
    throw new Error("API access token not found");
  }

  const rawDeptData = await fetch(
    `https://api.princeton.edu/student-app/courses/courses?term=${term}&fmt=json&subject=${dept}`,
    {
      method: "GET",
      headers: {
        Authorization: token,
      },
    }
  );

  const deptData: any = await rawDeptData.json();
  if (!deptData.term[0].subjects) {
    console.error("No courses found for department " + dept);
    return [];
  }

  // Find correct department
  const correctIndex = deptData.term[0].subjects.findIndex(
    (x: any) => x.code === dept
  );

  if (correctIndex === -1) {
    console.error("No courses found for department " + dept);
    return [];
  }

  return deptData.term[0].subjects[correctIndex].courses;
};

/**
 * Fetch course details for a given course in a given term
 * @param listingId Listing ID
 * @param term Term code
 * @returns
 */
export const fetchRegCourseDetails = async (
  listingId: string,
  term: number
) => {
  const token = process.env.API_ACCESS_TOKEN;
  if (!token) {
    throw new Error("API access token not found");
  }

  const rawCourseDetails = await fetch(
    `https://api.princeton.edu/student-app/1.0.3/courses/details?term=${term}&course_id=${listingId}&fmt=json`,
    {
      method: "GET",
      headers: {
        Authorization: token,
      },
    }
  );

  const courseDetails: any = await rawCourseDetails.json();

  const valid =
    courseDetails &&
    courseDetails.course_details &&
    courseDetails.course_details.course_detail;

  if (!valid) {
    throw new Error("Invalid course details response format");
  }

  return courseDetails.course_details.course_detail;
};
