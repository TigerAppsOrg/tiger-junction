import { fetchRegListings } from "./fetchers";
import { supabase } from "./shared";
import type { RegListings } from "./types";

type FormattedListing = {
  id: string;
  code: string;
  title: string;
  aka: string[] | null;
  ult_term: number;
  pen_term: number | null;
};

/**
 * Populates the listings for a given term
 * @param term numerical term to populate the listings for
 */
const populateListings = async (term: number) => {
  console.log("Populating listings for term " + term);
  let time = new Date();

  // Fetch the current listings from registrar API and existing listings from Supabase
  const initPromises = [
    fetchRegListings(term),
    supabase
      .from("listings")
      .select("id, title, aka, ult_term, pen_term, code"),
  ];

  const [regListings, { data: currentListings, error: listFetchError }] =
    (await Promise.all(initPromises)) as [
      RegListings,
      {
        data: FormattedListing[];
        error: Error | null;
      }
    ];

  if (listFetchError) {
    console.error(listFetchError);
    return;
  }

  const formattedCourselist = regListings.map((x) => {
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

  console.log(formattedCourselist.length + " courses to process");
  for (const course of formattedCourselist) {
    const existingCourse = currentListings.find((x) => x.id === course.id);

    // Merge with existing data
    if (existingCourse) {
      // Fix a bug caused by an earlier version of the script
      if (
        existingCourse.pen_term &&
        existingCourse.ult_term <= existingCourse.pen_term
      ) {
        existingCourse.pen_term === null;
      }

      if (term === existingCourse.ult_term) {
        course.aka = existingCourse.aka;
        course.ult_term = existingCourse.ult_term;
        course.pen_term = existingCourse.pen_term;
      } else if (term > existingCourse.ult_term) {
        course.pen_term = existingCourse.ult_term;

        if (existingCourse.title !== course.title) {
          if (!existingCourse.aka || existingCourse.aka.length === 0) {
            course.aka = [existingCourse.title];
          } else if (!existingCourse.aka.includes(existingCourse.title)) {
            course.aka = [...existingCourse.aka, existingCourse.title];
          } else {
            course.aka = existingCourse.aka;
          }
        }
      } else {
        course.ult_term = existingCourse.ult_term;
        course.code = existingCourse.code;
        if (!existingCourse.pen_term || term >= existingCourse.pen_term) {
          course.pen_term = term;
        } else {
          course.pen_term = existingCourse.pen_term;
        }

        if (!existingCourse.aka || existingCourse.aka.length === 0) {
          course.aka = [course.title];
        } else if (!existingCourse.aka.includes(course.title)) {
          course.aka = [...existingCourse.aka, course.title];
        } else {
          course.aka = existingCourse.aka;
        }
      }
    }

    // Ensure constraints
    if (course.aka) {
      if (course.aka.includes(course.title)) {
        course.aka = course.aka.filter((x) => x !== course.title);
      }
      if (course.aka.length === 0) {
        course.aka = null;
      }
      course.aka = Array.from(new Set(course.aka)).sort();
    }

    if (course.pen_term && course.pen_term >= course.ult_term) {
      console.error("Error course:", course);
      throw new Error(
        `Course ${course.code} has a penultimate term that is greater than or equal to the ultimate term`
      );
    }
  }

  // Upsert to Supabase
  const { error } = await supabase.from("listings").upsert(formattedCourselist);

  if (error) {
    console.error(error);
    return;
  }

  console.log(
    "Populated listings for term " +
      term +
      " in " +
      (new Date().getTime() - time.getTime()) +
      "ms"
  );
};

await populateListings(1252);
