import { createClient } from "@supabase/supabase-js";

export const TERMS = [
  1252, 1244, 1242, 1234, 1232, 1224, 1222, 1214, 1212, 1204, 1202, 1194, 1192,
];

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
