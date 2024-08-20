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
type SupabaseListing = Omit<FormattedListing, "code">;

/**
 * Populates the listings for a given term
 * @param term numerical term to populate the listings for
 */
const populateListings = async (term: number) => {
  let time = new Date();
  const token = await getToken();

  // Fetch the current listings from registrar API and existing listings from Supabase
  const initPromises = [
    fetch(`${TERM_URL}${term}`, {
      method: "GET",
      headers: {
        Authorization: token,
      },
    }),
    supabase.from("listings").select("id, title, aka, ult_term, pen_term"),
  ];

  const [regDataRaw, { data: currentListings, error: listFetchError }] =
    (await Promise.all(initPromises)) as [
      Response,
      {
        data: SupabaseListing[];
        error: Error | null;
      }
    ];

  if (listFetchError) {
    console.error(listFetchError);
    return;
  }

  // Process the data from the registrar API
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

  console.log(formattedCourselist.length + " courses to process");
  for (const course of formattedCourselist) {
    const existingCourse = currentListings.find((x) => x.id === course.id);

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

  // Upsert to Supabase
  const { error } = await supabase.from("listings").upsert(formattedCourselist);

  if (error) {
    console.error(error);
    return;
  }

  console.log(
    "Listings populated in " + (new Date().getTime() - time.getTime()) + "ms"
  );
};

populateListings(1252);
