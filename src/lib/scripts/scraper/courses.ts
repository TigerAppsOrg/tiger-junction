import type { SupabaseClient } from "@supabase/supabase-js";
import { getCourseIds } from "$lib/scripts/scraper/reg";
import { REGISTRAR_AUTH_BEARER, COURSE_URL } from "$lib/constants";
import type { CourseInsert, InstructorInsert } from "$lib/types/dbTypes";
import { daysToValue, timeToValue } from "../convert";
import type { GradingInfo, RegCourse, RegSeatReservation, RegSection } from "$lib/types/regTypes";

const SUCCESS_MESSAGE = "Successfully began populating courses for term: ";
const RATE = 0; // Number of milliseconds between requests

// TODO - Calculate is_open value

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
    ids = ids.slice(0, 100);

    const processNextCourse = (index: number) => {
        if (index >= ids.length) return;

        // Fetch course data for id
        fetch(
            `${COURSE_URL}term=${term}&course_id=${ids[index]}`, {
                method: "GET",
                headers: {
                    "Authorization": REGISTRAR_AUTH_BEARER
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

            let data: RegCourse = raw.course_details.course_detail[0];

            console.log(data.crosslistings);
            console.log(data.course_instructors.course_instructor);

            // Format course data
            let course: CourseInsert = {
                listing_id: data.course_id,
                term: parseInt(data.term),
                code: data.crosslistings.replace(/\s/g, ""),
                title: data.topic_title === null ? 
                    data.long_title : 
                    data.long_title + ": " + data.topic_title,
                grading_info: parseGradingInfo(data),
                course_info: parseCourseInfo(data),
                is_open: true,
                basis: data.grading_basis,
                dists: data.distribution_area_short ?  
                data.distribution_area_short.split(" or ").sort() :
                null,
            };

            // Check if course exists in database
            supabase.from("courses")
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
                supabase.from("courses")
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
                            supabase,
                            res.data[0].id,
                            data.course_instructors.course_instructor,
                            data.course_sections.course_section
                        );

                        setTimeout(() => {
                            console.log("Sent request: " + index);
                            processNextCourse(index + 1);
                        }, RATE);
                    });
                } else {
                supabase.from("courses")
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
                            supabase,
                            res.data[0].id,
                            data.course_instructors.course_instructor,
                            data.course_sections.course_section
                        );

                        setTimeout(() => {
                            console.log("Sent request: " + index);
                            processNextCourse(index + 1);
                        }, RATE);
                    });
                }
            }); 
        }); 
    }

    processNextCourse(0);
    
    return {
        message: SUCCESS_MESSAGE + term,
        ids
    };
}


// Parse grading info from registrar data
const parseGradingInfo = (data: RegCourse) => {
    let gradingInfo: Record<string, string> = {};

    const genericGradingInfo: GradingInfo = {
        grading_design_projects: "Design Projects",
        grading_final_exam: "Final Exam",
        grading_home_final_exam: "Home Final Exam",
        grading_home_mid_exam: "Home Mid Exam",
        grading_lab_reports: "Lab Reports",
        grading_mid_exam: "Mid Exam",
        grading_oral_pres: "Oral Presentation",
        grading_other: "Other",
        grading_other_exam: "Other Exam",
        grading_paper_final_exam: "Paper Final Exam",
        grading_paper_mid_exam: "Paper Mid Exam",
        grading_papers: "Papers",
        grading_precept_part: "Precept Participation",
        grading_prob_sets: "Problem Sets",
        grading_prog_assign: "Programming Assignments",
        grading_quizzes: "Quizzes",
        grading_term_paper: "Term Paper",
    };

    for (let key in genericGradingInfo) 
        if (data[key] && data[key] !== "0")
            gradingInfo[genericGradingInfo[key as keyof GradingInfo]] 
        = data[key];
    
    return gradingInfo;
}

// Parse course info from registrar data
const parseCourseInfo = (data: RegCourse) => {
    let courseInfo: Record<string, string | RegSeatReservation> = {};

    if (data.description)
        courseInfo["Description"] = data.description;
    if (data.reading_writing_assignment)
        courseInfo["Assignments"] = data.reading_writing_assignment;
    if (data.other_information)
        courseInfo["Information"] = data.other_information;
    if (data.other_requirements)
        courseInfo["Requirements"] = data.other_requirements;
    if (data.other_restrictions)
        courseInfo["Restrictions"] = data.other_restrictions;
    if (Object.keys(data.seat_reservations).length === 0)
        courseInfo["Reservations"] = data.seat_reservations;

    return courseInfo;
}

/**
 * 
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
        for (let instructor of instructors)
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
 * 
 * @param supabase 
 * @param course_id 
 * @param sections 
 */
const updateSections = async (supabase: SupabaseClient,
course_id: number, sections: RegSection[]) => {
    for (let section of sections) {
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
                    let formattedSection = {
                        course_id,
                        title: section.section,
                        category: section.section[0],
                        num: section.class_number,
                        building: section.building ? 
                            section.building + " " + section.room :
                            null,
                        tot: section.enrl_tot,
                        cap: section.enrl_cap,
                        days: daysToValue(section),
                        start_time: timeToValue(section.start_time),
                        end_time: timeToValue(section.end_time),
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
                            building: section.building ?
                                section.building + " " + section.room :
                                null,
                            tot: section.enrl_tot,
                            cap: section.enrl_cap,
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

const updateCourseDependencies = async (supabase: SupabaseClient, 
course_id: number, instructors: InstructorInsert[], 
sections: RegSection[]) => {

    if (instructors)
        updateInstructors(supabase, course_id, instructors);

    if (sections)
        updateSections(supabase, course_id, sections);
}

export { populateCourses, updateInstructors, updateSections }