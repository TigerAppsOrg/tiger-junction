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

const fetchDeptCourses = async (dept: string, term: number) => {
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

const fetchCourseDetails = async (listingId: string, term: number) => {
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

console.log(await fetchCourseDetails("017400", 1252));
