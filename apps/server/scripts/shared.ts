import { createClient } from "@supabase/supabase-js";

export const TERMS = [
  1252, 1244, 1242, 1234, 1232, 1224, 1222, 1214, 1212, 1204, 1202, 1194, 1192,
];

export const REG_LISTINGS_URL =
  "https://api.princeton.edu/registrar/course-offerings/classes/";

export const COURSE_URL =
  "https://api.princeton.edu/registrar/course-offerings/1.0.2/course-details?";

export const REG_API_URL = "https://api.princeton.edu/student-app/1.0.3/";

export const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL as string,
  process.env.SERVICE_ROLE_KEY as string,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Gets the API token from the registrar API
 * @returns - The token to be used in the header of the request to the registrar API
 */
export const getToken = async () => {
  const response = await fetch(
    "https://registrar.princeton.edu/course-offerings"
  );
  const text = await response.text();
  return "Bearer " + text.split('apiToken":"')[1].split('"')[0];
};
