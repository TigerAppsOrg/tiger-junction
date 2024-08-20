import type { SupabaseClient } from "@supabase/supabase-js";
import { getToken, TERM_URL } from "./shared";

type StringBoolean = "Y" | "N";

type RegListings = {
  classes: {
    class: {
      class_number: string;
      crosslistings: string;
      subject: string;
      distribution_area: string;
      section: string;
      building_code: string | null;
      building_name: string | null;
      room: string | null;
      catnum: string;
      mon: StringBoolean;
      tues: StringBoolean;
      wed: StringBoolean;
      thurs: StringBoolean;
      fri: StringBoolean;
      sat: StringBoolean;
      sun: StringBoolean;
      term: string;
      course_id: string;
      class_meetings: string;
      meeting_pattern: string;
      acad_career: string;
      end_time: string;
      long_title: string;
      start_time: string;
      topic_title: string | null;
      class_status: string;
    }[];
  };
};

type FormattedListing = {
  id: string;
  code: string;
  title: string;
  aka: string | null;
  ult_term: number;
  pen_term: number | null;
};

const populateListings = async (term: number) => {
  // Fetch data from registrar API and format it
  const token = await getToken();
  const regDataRaw = await fetch(`${TERM_URL}${term}`, {
    method: "GET",
    headers: {
      Authorization: token,
    },
  });

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

  console.log(formattedCourselist);
};

populateListings(1252);
