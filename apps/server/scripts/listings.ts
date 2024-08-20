import { getToken, supabase, TERM_URL } from "./shared";
import type { RegListings } from "./types";

type FormattedListing = {
  id: string;
  code: string;
  title: string;
  aka: string[] | null;
  ult_term: number;
  pen_term: number | null;
};

const populateListings = async (term: number) => {
  let time = new Date();

  // Fetch data from registrar API and format it
  const token = await getToken();
  const regDataRaw = await fetch(`${TERM_URL}${term}`, {
    method: "GET",
    headers: {
      Authorization: token,
    },
  });

  console.log(
    "Time taken to fetch data from registrar: " +
      (new Date().getTime() - time.getTime()) +
      "ms"
  );
  time = new Date();

  const regData = (await regDataRaw.json()) as RegListings;
  const courselist = regData.classes.class;
  let formattedCourselist = courselist.map((x) => {
    return {
      id: x.course_id,
      code: x.subject + x.catnum,
      title:
        x.topic_title === null
          ? x.long_title
          : x.long_title + ": " + x.topic_title,
      aka: null,
      ult_term: term,
      pen_term: null,
    } as FormattedListing;
  });

  // Remove duplicates
  const seen = new Set();
  formattedCourselist = formattedCourselist.filter((x) => {
    const duplicate = seen.has(x.id);
    seen.add(x.id);
    return !duplicate;
  });

  console.log(
    "Time taken to format data: " +
      (new Date().getTime() - time.getTime()) +
      "ms"
  );
  time = new Date();

  const { data: currentListings, error: listFetchError } = await supabase
    .from("listings")
    .select("id, title, aka, ult_term, pen_term");

  if (listFetchError) {
    console.error(listFetchError);
    return "Error fetching listings";
  }

  console.log(
    "Time taken to fetch data from Supabase: " +
      (new Date().getTime() - time.getTime()) +
      "ms"
  );
  time = new Date();

  console.log(formattedCourselist.length + " courses to process");
  for (const course of formattedCourselist) {
    const existingCourse = currentListings.find((x) => x.id === course.id);

    if (existingCourse) {
      // Fix a bug caused by an earlier version of the script
      if (existingCourse.ult_term <= existingCourse.pen_term) {
        existingCourse.pen_term === null;
      }

      if (term === existingCourse.ult_term) {
        course.aka = existingCourse.aka;
      } else if (term > existingCourse.ult_term) {
        course.pen_term = existingCourse.ult_term;

        if (existingCourse.title !== course.title) {
          if (!existingCourse.aka) {
            course.aka = [existingCourse.title];
          } else if (!existingCourse.aka.includes(existingCourse.title)) {
            course.aka = [...existingCourse.aka, existingCourse.title];
          } else {
            course.aka = existingCourse.aka;
          }
        }
      } else {
        if (!existingCourse.pen_term || term >= existingCourse.pen_term) {
          course.pen_term = term;
        }

        if (!existingCourse.aka) {
          course.aka = [course.title];
        } else if (!existingCourse.aka.includes(course.title)) {
          course.aka = [...existingCourse.aka, course.title];
        } else {
          course.aka = existingCourse.aka;
        }
      }
    }

    // Ensure constraints
    if (course.aka && course.aka.includes(course.title)) {
      course.aka = course.aka.filter((x) => x !== course.title);
    }

    if (course.pen_term && course.pen_term >= course.ult_term) {
      throw new Error(
        `Course ${course.code} has a penultimate term that is greater than or equal to the ultimate term`
      );
    }
  }

  console.log(
    "Time taken to process data: " +
      (new Date().getTime() - time.getTime()) +
      "ms"
  );
  time = new Date();

  // console.log(formattedCourselist);
  // Upsert to Supabase
};

populateListings(1252);
