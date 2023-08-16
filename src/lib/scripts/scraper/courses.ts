import type { SupabaseClient } from "@supabase/supabase-js";
import { getCourseIds } from "$lib/scripts/scraper/reg";
import { REGISTRAR_AUTH_BEARER, COURSE_URL } from "$lib/constants";
import type { CourseInsert, InstructorInsert } from "$lib/types/dbTypes";
import { timeToValue } from "../convert";

const SUCCESS_MESSAGE = "Successfully began populating courses for term: ";

/**
 * Pushes all courses for a given term to the database
 * @param supabase 
 * @param term 
 * @returns success or failure message
 */
const populateCourses = async (supabase: SupabaseClient, term: number) => {
    // Fetch all course ids for the given term
    let ids = await getCourseIds(term);

    // Limit number of courses
    ids = ids.slice(0, 10);

    // Used to wait for all fetches to complete
    let count: number = 0;

    for (let i = 0; i < ids.length; i++) {
        // Fetch course data for id
        fetch(
            `${COURSE_URL}term=${term}&course_id=${ids[i]}`, {
                method: "GET",
                headers: {
                    "Authorization": REGISTRAR_AUTH_BEARER
                }
            }
        ) // * End Registrar Fetch
        .then(res => res.json())
        .then(raw => {
            let data = raw.course_details.course_detail[0];

            // Format course data
            let course: CourseInsert = {
                listing_id: data.course_id,
                term: data.term,
                code: data.crosslistings.replace(/\s/g, ""),
                title: data.topic_title === null ? 
                    data.long_title : 
                    data.long_title + ": " + data.topic_title,
                description: data.description,
                assignments: data.reading_writing_assignment,
                is_open: true,
                basis: data.grading_basis,
                dists: data.distribution_area_short.split(" or "),
            };

            // Upsert course data to database
            supabase.from("courses").upsert(course).select("id")
            .then(res => {
                if (res.error) throw new Error(res.error.message);
                
                let course_id = res.data[0].id;

                // Upsert instructor data to database
                let instructors: InstructorInsert[] = 
                data.course_instructors.course_instructor;

                supabase.from("instructors").upsert(instructors)
                .then(res => {
                    if (res.error) throw new Error(res.error.message);

                    // Set course-instructor association in database
                    for (let instructor of instructors)
                        supabase.from("course_instructor_associations")
                            .upsert({
                                course_id,
                                instructor_id: instructor.netid
                            })
                            .then(res => {
                                if (res.error) throw new Error(res.error.message);
                        });
                }); // * End Instructors Associations

                // Upsert section information to database
                let sections: any[] = data.course_sections.course_section;
                for (let section of sections) {
                    supabase.from("sections")
                        .select("id")
                        .eq("course_id", course_id)
                        .eq("num", section.class_number)
                        .then(res => {
                            if (res.error) throw new Error(res.error.message);

                            // If section doesn't exist, create it
                            if (res.data.length === 0) {
                                let formattedSection = {
                                    course_id,
                                    num: section.class_number,
                                    building: section.building ? 
                                        section.building + " " + section.room :
                                        null,
                                    tot: section.enrl_tot,
                                    cap: section.enrl_cap,
                                    days: calculateDays(section),
                                    start_time: timeToValue(section.start_time),
                                    end_time: timeToValue(section.end_time),
                                };

                                supabase.from("sections")
                                    .insert(formattedSection)
                                    .then(res => {
                                        if (res.error) throw new Error(res.error.message);
                                    }); 

                            // If section does exist, update it
                            } else {
                                supabase.from("sections")
                                    .update({
                                        building: section.building ?
                                            section.building + " " + section.room :
                                            null,
                                        tot: section.enrl_tot,
                                        cap: section.enrl_cap,
                                    }).then(res => {
                                        if (res.error) throw new Error(res.error.message);
                                    });
                            }    
                        }); // * End Individual Section
                } // * End Section Loop 
                // Section_data updates wtih a trigger on section upsert
            }); // * End Courses
        }); // * End Upload
    }

    return {
        message: SUCCESS_MESSAGE + term,
        ids
    };
}

/**
 * TODO
 * @param supabase 
 * @param term 
 */
const updateSections = async (supabase: SupabaseClient, term: string) => {

}    

// TODO
// const sectionLogic = async (supabase: SupabaseClient) => {
//     let { data, error } = await supabase.from("sections")
//         .update({
//             building: section.building ?
//                 section.building + " " + section.room :
//                 null,
//             tot: section.enrl_tot,
//             cap: section.enrl_cap,
//         })

//     if (error) return {
//         status: 500,
//         message: FAILURE_MESSAGE,
//     }

//     return data;
// }

// Calculates the numerical value for the days a section meets
const calculateDays = (section: any) => {
    let days = 0;
    if (section.mon === "Y") days += 1;
    if (section.tues === "Y") days += 2;
    if (section.wed === "Y") days += 4;
    if (section.thurs === "Y") days += 8;
    if (section.fri === "Y") days += 16;
    return days;
}



export { populateCourses }