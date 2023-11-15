// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { SupabaseClient, createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";
import { RegCourse, RegSection, WeekDays } from "../../../src/lib/types/regTypes.ts";
import { CourseInsert, InstructorInsert } from "../../../src/lib/types/dbTypes.ts";
import { RegGradingInfo } from "../../../src/lib/types/regTypes.ts";

// console.log("Scraping courses from registrar")

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
  const { term, round } = await req.json();

  if (!term || round === undefined) {
    throw new Error("Invalid request body");
  }

  // Get token
  const tokenRes = await fetch("https://registrar.princeton.edu/course-offerings");
  const text = await tokenRes.text();
  const token = "Bearer " + text.split("apiToken\":\"")[1].split("\"")[0];

  const rawCourselist = await fetch(`https://api.princeton.edu/registrar/course-offerings/classes/${term}`, {
    method: "GET",
    headers: {
        "Authorization": token
    }
  });

  type IdStatus = {
    id: string,
    status: number
  }

  const jsonCourselist = await rawCourselist.json();
  let courselist: IdStatus[] = jsonCourselist.classes.class.map((x: RegCourse) => {
    return {
      id: x.course_id,
      status: calculateStatus(x.calculated_status)
    }
  });

  const removeDup = (arr: IdStatus[]) => {
    const ids = [];
    const toReturn: {id: string, status: number}[] = [];
    for (const course of arr) {
        if (!ids.includes(course.id)) {
            ids.push(course.id);
            toReturn.push(course);
        } else {
          const index = toReturn.findIndex(x => x.id === course.id);
          if (course.status === 0) toReturn[index] = course;
        }
    }
    return toReturn;
  }

  courselist = removeDup(courselist);

  // Analytics
  let count = 0;

  const processNextCourse = (index: number) => {
    if (index >= courselist.length) return;   // Base case
    console.log("Sending Request " + index);
    count++;

    fetch(
      `https://api.princeton.edu/registrar/course-offerings/1.0.2/course-details?term=${term}&course_id=${courselist[index].id}`, {
        method: "GET",
        headers: {
            "Authorization": token
        }
      }
    )
    .then(res => res.json())
    .then(raw => {
      if (!raw || !raw.course_details
        || !raw.course_details.course_detail 
        || raw.course_details.course_detail.length === 0) {
            console.log("Line PC1");
            console.log(raw);
            throw new Error(raw);
        }

        const data: RegCourse = raw.course_details.course_detail[0];

        // Format course data
        const course: CourseInsert = {
            listing_id: data.course_id,
            term: parseInt(data.term),
            code: data.crosslistings.replace(/\s/g, ""),
            title: data.topic_title === null ? 
                data.long_title : 
                data.long_title + ": " + data.topic_title,
            grading_info: parseGradingInfo(data),
            // course_info: parseCourseInfo(data),
            // reading_info: parseReadingInfo(data),
            status: courselist[index].status,
            basis: data.grading_basis,
            dists: data.distribution_area_short ?  
            data.distribution_area_short.split(" or ").sort() :
            null,
        };

        // Check if course exists in database
        supabaseClient.from("courses")
            .select("id")
            .eq("listing_id", course.listing_id)
            .eq("term", course.term)
        .then(res => {
            if (res.error) {
                console.log("Line PC2");
                console.log(res);
                console.log(course);
                throw new Error(res.error.message);
            }
            
            // If course doesn't exist, create it
            if (res.data.length === 0) {
              supabaseClient.from("courses")
                .insert(course)
                .select("id")
                .then(res => {
                    if (res.error) {
                        console.log("Line PC3");
                        console.log(res);
                        console.log(course);
                        throw new Error(res.error.message);
                    }

                    updateCourseDependencies(
                        supabaseClient,
                        res.data[0].id,
                        data.course_instructors.course_instructor,
                        data.course_sections.course_section
                    );
                });
            } else {
            supabaseClient.from("courses")
                .update(course)
                .eq("id", res.data[0].id)
                .select("id")
                .then(res => {
                    if (res.error) {
                        console.log("Line PC4");
                        console.log(res);
                        console.log(course);
                        throw new Error(res.error.message);
                    }
                    
                    updateCourseDependencies(
                        supabaseClient,
                        res.data[0].id,
                        data.course_instructors.course_instructor,
                        data.course_sections.course_section
                    );
              });
            }
        }); 
    })
  }

  // Send PAR_REQS requests in parallel
  const PAR_REQS = 20;
  for (let i = round * PAR_REQS; 
    i < Math.min(round * PAR_REQS + PAR_REQS, courselist.length); 
    i++) {
    processNextCourse(i);
  }

  let lastRound = false;
  if (round * PAR_REQS + PAR_REQS >= courselist.length) {
    lastRound = true;
  }

  if (!lastRound) {
    supabaseClient.functions.invoke("courses", {
      body: { term, round: round + 1 },
    });
  }

  // Return information about course scrapings
  return new Response(
    JSON.stringify({ message: `${count} courses scraped`, lastRound }),
    { headers: { "Content-Type": "application/json" } },
  )
});

/**
 * Update instructors for a given course
 * @param supabase 
 * @param course_id 
 * @param instructors 
 */
const updateInstructors = async (supabase: SupabaseClient, 
  course_id: number, instructors: InstructorInsert[]) => {
  
      // Upsert instructor data to database
      supabase.from("instructors").upsert(instructors)
      .then(res => {
          if (res.error) {
              console.log("Line UI1");
              console.log(res);
              console.log(instructors);
              console.log(course_id);
              throw new Error(res.error.message);
          }
  
          // Set course-instructor association in database
          for (const instructor of instructors)
              supabase.from("course_instructor_associations")
                  .upsert({
                      course_id,
                      instructor_id: instructor.netid
                  })
                  .then(res => {
                      if (res.error) {
                          console.log("Line UI2");
                          console.log(res);
                          console.log(instructors);
                          console.log(course_id);
                          throw new Error(res.error.message);
                      }
              });
      });
  }
  
  /**
   * Update sections for a given course
   * @param supabase 
   * @param course_id 
   * @param sections 
   */
  const updateSections = async (supabase: SupabaseClient,
  course_id: number, sections: RegSection[]) => {
    for (const section of sections) {
      supabase.from("sections")
        .select("id")
        .eq("course_id", course_id)
        .eq("num", section.class_number)
        .then(res => {
          if (res.error) {
            console.log("Line US1");
            console.log(res);
            console.log(sections);
            console.log(course_id);
            throw new Error(res.error.message);
          }
  
          // If section doesn't exist, create it
          if (res.data.length === 0) {
            const formattedSection = {
              course_id,
              title: section.section,
              category: section.section[0],
              num: section.class_number,
              room: parseBuilding(section),
              tot: section.enrl_tot,
              cap: section.enrl_cap,
              days: daysToValue(section),
              start_time: timeToValue(section.start_time),
              end_time: timeToValue(section.end_time),
              status: calculateStatus(section.calculated_status),
            };

            supabase.from("sections")
              .insert(formattedSection)
              .then(res => {
                if (res.error) {
                  console.log("Line US2");
                  console.log(res);
                  console.log(sections);
                  console.log(course_id);
                  throw new Error(res.error.message);
                }
              }); 
  
            // If section does exist, update it
            } else {
              supabase.from("sections")
                .update({
                  room: parseBuilding(section),
                  tot: section.enrl_tot,
                  cap: section.enrl_cap,
                  status: calculateStatus(section.calculated_status),
                  start_time: timeToValue(section.start_time),
                  end_time: timeToValue(section.end_time),
                  days: daysToValue(section),
                })
                .eq("id", res.data[0].id)
                .then(res => {
                  if (res.error) {
                    console.log("Line US3");
                    console.log(res);
                    console.log(sections);
                    console.log(course_id);
                    throw new Error(res.error.message);
                  }
                });
            }    
          }); 
      } 
} 

// Calculate course status
const calculateStatus = (status: string) => {
  switch (status) {
      case "Open":
          return 0;
      case "Closed":
          return 1;
      case "Canceled":
          return 2;
      default:
          return 3;
  }
}

const parseGradingInfo = (data: RegCourse) => {
  const GENERIC_GRADING_INFO: RegGradingInfo = {
    grading_design_projects: "Design Project", 
    grading_final_exam: "Final Scheduled Exam",
    grading_home_final_exam: "Take Home Final Exam",
    grading_home_mid_exam: "Take Home Midterm Exam", 
    grading_lab_reports: "Lab Reports",
    grading_mid_exam: "Midterm Exam",
    grading_oral_pres: "Presentation or Performance",
    grading_other: "Other", 
    grading_other_exam: "Exam(s) Given During Term",
    grading_paper_final_exam: "Final Paper or Project",
    grading_paper_mid_exam: "Midterm Paper or Project", 
    grading_papers: "Papers/Writing Assignments",
    grading_precept_part: "Participation",
    grading_prob_sets: "Problem Sets",
    grading_prog_assign: "Programming Assignments",
    grading_quizzes: "Quizzes", 
    grading_term_papers: "Term Paper(s)", 
    pu_pres_final_exam: "Final presentation or Performance",
    pu_projects: "Project(s)",
};

  const gradingInfo: Record<string, string> = {};
  for (const key in GENERIC_GRADING_INFO) 
      if (data[key] && data[key] !== "0")
          gradingInfo[GENERIC_GRADING_INFO[key as keyof RegGradingInfo]] 
      = data[key];
  
  return gradingInfo;
}

// Parse building and room from registrar data and handle edge case
const parseBuilding = (section: RegSection) => {
  if (!section.building_name 
      || section.building_name === "No Room Required")
      return null;
  else
      return section.building_name + " " + section.room 
}

const updateCourseDependencies = async (supabase: SupabaseClient, 
course_id: number, instructors: InstructorInsert[], 
sections: RegSection[]) => {

  if (instructors) updateInstructors(supabase, course_id, instructors);
  if (sections) updateSections(supabase, course_id, sections);
}

const timeToValue = (time: string) => {
  const TIME_CONVERSION: Record<string, number> = {
    "ZERO_ADJUST": 48,      
    "HOUR_FACTOR": 6,       
    "MINUTE_FACTOR": 0.1,   
    "NULL_TIME": -42,       
  }

  if (time === undefined) 
      return TIME_CONVERSION.NULL_TIME;

  const dig = time.split(" ")[0].split(":").map((x) => parseInt(x));
  const pm = time.split(" ")[1] === "pm";

  if (dig[0] === 12) dig[0] = 0;

  let val = (dig[0] * TIME_CONVERSION.HOUR_FACTOR)
      + (dig[1] * TIME_CONVERSION.MINUTE_FACTOR)
      - TIME_CONVERSION.ZERO_ADJUST;

  if (pm) val += 12 * TIME_CONVERSION.HOUR_FACTOR;

  // Round to nearest tenth (account for floating point error)
  return Math.round((val * 10)) / 10;
}

const daysToValue = (section: WeekDays) => {
  let days = 0;
  if (section.mon === "Y") days += 1;
  if (section.tues === "Y") days += 2;
  if (section.wed === "Y") days += 4;
  if (section.thurs === "Y") days += 8;
  if (section.fri === "Y") days += 16;
  return days;
}

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/courses' \
//   --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
//   --header 'Content-Type: application/json' \
//   --data '{"term":1242}'
