// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// import { populateCourses } from "../../../src/lib/scripts/scraper/courses.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";
import { RegCourse } from "../../../src/lib/types/regTypes.ts";
import { CourseInsert } from "../../../src/lib/types/dbTypes.ts";
import { GENERIC_GRADING_INFO } from "../../../src/lib/constants.ts";
import { RegGradingInfo } from "../../../src/lib/types/regTypes.ts";
import { populateCourses } from "../../../src/lib/scripts/scraper/courses.ts";

console.log("Scraping courses from registrar")

Deno.serve(async (req) => {
  // Check if user is admin
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {global: { headers: { Authorization: req.headers.get('Authorization')! }}}
  );

  const { data: { user }} = await supabaseClient.auth.getUser();
  if (!user) {
    throw new Error("User not found");
  }

  const { data, error } = await supabaseClient.from('private_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (error || !data) {
    throw new Error(error.message);
  }

  if (!data?.is_admin) {
    throw new Error("User not admin");
  }

  // Scrape courses for term 
  // Code modified from src/lib/scripts/scraper/courses.ts
  const { term } = await req.json();

  await populateCourses(supabaseClient, term);

  return new Response(
    JSON.stringify({ message: "Courses scraped" }),
    { headers: { "Content-Type": "application/json" } },
  )
});

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/' \
//   --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
//   --header 'Content-Type: application/json' \
//   --data '{"name":"Functions"}'
