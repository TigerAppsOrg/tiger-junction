import type { SupabaseClient } from "@supabase/supabase-js";
import { REGISTRAR_AUTH_BEARER, COURSE_URL, GENERIC_GRADING_INFO, TERM_URL } from "$lib/constants";
import type { CourseInsert, InstructorInsert } from "$lib/types/dbTypes";
import { daysToValue, timeToValue } from "../convert";
import type { RegGradingInfo, RegCourse, RegSeatReservation, RegSection } from "$lib/types/regTypes";

const SUCCESS_MESSAGE = "Successfully began populating courses for term: ";
const PARALLEL_REQUESTS = 10; // Number of parallel requests to send
const RATE = 0; // Number of milliseconds between requests

/**
 * Pushes all courses for a given term to the database
 * @param supabase 
 * @param term 
 * @returns success or failure message
 */
const populateCourses = async (supabase: SupabaseClient, term: number) => {
    // Fetch all course ids and open status for the given term
    const rawCourselist = await fetch(`${TERM_URL}${term}`, {
        method: "GET",
        headers: {
            "Authorization": REGISTRAR_AUTH_BEARER
        }
    });

    type IdStatus = {
        id: string,
        status: number
    }

    const jsonCourselist = await rawCourselist.json();
    let courselist: IdStatus[] = jsonCourselist.classes.class.map((x: any) => {
        return {
            id: x.course_id,
            status: calculateStatus(x.calculated_status)
        }
    });

    // Remove duplicate course ids from courselist
    const removeDup = (arr: IdStatus[]) => {
        let ids: string[] = [];
        let toReturn: {id: string, status: number}[] = [];
        for (let course of arr) {
            if (!ids.includes(course.id)) {
                ids.push(course.id);
                toReturn.push(course);
            }
        }
        return toReturn;
    }

    courselist = removeDup(courselist);

    // Limit number of courses
    // courselist = courselist.slice(0, 100);

    const processNextCourse = async (index: number) => {
        if (index >= courselist.length) return;
        console.log("Sending request: " + index);

        // Fetch course data for id
        fetch(
            `${COURSE_URL}term=${term}&course_id=${courselist[index].id}`, {
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
                reading_info: parseReadingInfo(data),
                status: courselist[index].status,
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
                            processNextCourse(index + PARALLEL_REQUESTS);
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
                            processNextCourse(index + PARALLEL_REQUESTS);
                        }, RATE);
                    });
                }
            }); 
        }); 
    }

    // Begin sending requests
    for (let i = 0; i < PARALLEL_REQUESTS; i++) processNextCourse(i);
    
    // Confirm requests sent
    console.log("Began all initial requests");
    return {
        message: SUCCESS_MESSAGE + term,
        ids: courselist.map(x => x.id)
    };
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

// Parse grading info from registrar data
const parseGradingInfo = (data: RegCourse) => {
    let gradingInfo: Record<string, string> = {};
    for (let key in GENERIC_GRADING_INFO) 
        if (data[key] && data[key] !== "0")
            gradingInfo[GENERIC_GRADING_INFO[key as keyof RegGradingInfo]] 
        = data[key];
    
    return gradingInfo;
}

// Parse course info from registrar data
const parseCourseInfo = (data: RegCourse) => {
    let courseInfo: Record<string, string | RegSeatReservation[]> = {};

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
    if (Object.keys(data.seat_reservations).length !== 0)
        courseInfo["Reservations"] = data.seat_reservations.seat_reservation;

    return courseInfo;
}

// Parse course reading info from registrar data
const parseReadingInfo = (data: RegCourse) => {
    const MAX_READINGS = 6;

    let readingInfo: Record<string, string> = {};
    let flag = false;

    for (let i = 1; i <= MAX_READINGS; i++) {
        if (data["reading_list_title_" + i] !== " ") {
            flag = true;
            readingInfo["T" + i] = data["reading_list_title_" + i];
        }

        if (data["reading_list_author_" + i] !== " ") {
            flag = true;
            readingInfo["A" + i] = data["reading_list_author_" + i];
        }
    }

    return flag ? readingInfo : null;
}

// Parse building and room from registrar data and handle edge case
const parseBuilding = (section: RegSection) => {
    if (!section.building_name 
        || section.building_name === "No Room Required")
        return null;
    else
        return section.building_name + " " + section.room 
}

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
 * Update sections for a given course
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
                        room: parseBuilding(section),
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
                            room: parseBuilding(section),
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