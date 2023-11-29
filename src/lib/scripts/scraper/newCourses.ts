import { API_ACCESS_TOKEN, REDIS_PASSWORD } from "$env/static/private";
import { DEPARTMENTS, GENERIC_GRADING_INFO, TERM_URL } from "$lib/constants";
import type { CourseInsert } from "$lib/types/dbTypes";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getToken } from "./getToken";
import { timeToValue } from "../convert";
import { createClient } from "redis";


export const populateCourses = async (supabase: SupabaseClient, term: number) => {
    console.log("Populating courses for term", term);

    const token = await getToken();
    // Fetch all course ids and open status for the given term
    const rawCourselist = await fetch(`${TERM_URL}${term}`, {
        method: "GET",
        headers: {
            "Authorization": token
        }
    });

    const jsonCourselist = await rawCourselist.json();
    const courselist = jsonCourselist.classes.class.map((x: any) => {
        return {
            listing_id: x.course_id,
            code: x.crosslistings.replace(/\s/g, ""),
            grading_info: calculateGradingInfo(x),
            status: calculateStatus(x.calculated_status),
            // basis: x.grading_basis,
            dists: x.distribution_area ?
                x.distribution_area.split(" or ").sort() :
                null,
        }
    });

    const startTime = Date.now();
    for (let i = 0; i < DEPARTMENTS.length; i++) {
        const subject = DEPARTMENTS[i];
        const subjectStartTime = Date.now();
        console.log("Populating", subject);

        const rawSubjectData = await fetch(
            `https://api.princeton.edu/student-app/courses/courses?term=${term}&fmt=json&subject=${subject}`, {
                method: "GET",
                headers: {
                    "Authorization": API_ACCESS_TOKEN
                }
            }
        );

        let subjectData = await rawSubjectData.json();
        if (!subjectData.term[0].subjects) continue;
        subjectData = subjectData.term[0];
        let correctIndex = subjectData.subjects.findIndex((x: any) => x.code === subject);
        if (correctIndex === -1) {
            console.log("Subject not found for term", term, ":", subject);
            continue;
        };
        subjectData = subjectData.subjects[correctIndex].courses;

        for (let j = 0; j < subjectData.length; j++) {
            let courselistEntry = courselist.find((x: any) => x.listing_id === subjectData[j].course_id);

            // Update course
            let course: CourseInsert = {
                listing_id: subjectData[j].course_id,
                term: term,
                code: courselistEntry.code,
                title: subjectData[j].title,
                grading_info: courselistEntry.grading_info,
                status: courselistEntry.status,
                // basis: courselistEntry.basis,
                dists: courselistEntry.dists,
                instructors: subjectData[j].instructors ? 
                    subjectData[j].instructors.map((x: any) => x.full_name) : 
                    null,
            }

            // Check if course exists in supabase
            const { data: exisCourse, error: exisCError } = await supabase.from("courses")
                .select("id")
                .eq("listing_id", course.listing_id)
                .eq("term", course.term)

            
            if (exisCError) {
                console.log("Error checking if course exists in supabase for", course.listing_id, "in term", course.term);
                throw new Error(exisCError.message);
            }

            let courseId: number;

            if (exisCourse.length > 0) {
                let { error } = await supabase
                    .from("courses")
                    .update(course)
                    .eq("id", exisCourse[0].id)

                if (error) {
                    console.log("Error updating course", course.listing_id, "in term", course.term);
                    throw new Error(error.message);
                }

                courseId = exisCourse[0].id;
            } else {
                let { data, error } = await supabase
                    .from("courses")
                    .insert(course)
                    .select("id")
                
                if (error) {
                    console.log("Error inserting course", course.listing_id, "in term", course.term);
                    throw new Error(error.message);
                }

                courseId = data[0].id;
            }

            for (let k = 0; k < subjectData[j].classes.length; k++) {
                let section = subjectData[j].classes[k];

                for (let l = 0; l < section.schedule.meetings.length; l++) {
                    let meeting = section.schedule.meetings[l];
                    let sectionData = {
                        course_id: courseId,
                        title: section.section,
                        category: section.section[0],
                        num: section.class_number,
                        room: section.building ? section.building : null,
                        tot: section.enrollment,
                        cap: section.capacity,
                        days: daysToValue(meeting.days),
                        start_time: timeToValue(meeting.start_time),
                        end_time: timeToValue(meeting.end_time),
                        status: section.status === "O" ? 0 : 1
                    }

                    // Check if section exists in supabase
                    const { data: exisSection, error: exisSError } = await supabase.from("sections")
                        .select("id")
                        .eq("course_id", sectionData.course_id)
                        .eq("num", sectionData.num)


                    if (exisSError) {
                        console.log("Error checking if section exists in supabase for", sectionData.course_id, "in term", term);
                        throw new Error(exisSError.message);
                    }
                    
                    if (exisSection.length > 0) {
                        let { error } = await supabase
                            .from("sections")
                            .update(sectionData)
                            .eq("id", exisSection[0].id)

                        if (error) {
                            console.log("Error updating section", sectionData.course_id, "in term", term);
                            throw new Error(error.message);
                        }
                    } else {
                        let { error } = await supabase
                            .from("sections")
                            .insert(sectionData)

                        if (error) {
                            console.log("Error inserting section", sectionData.course_id, "in term", term);
                            throw new Error(error.message);
                        }
                    }
                }
            }
        }

        console.log("Finished populating", subject, "in", Date.now() - subjectStartTime, "ms");
    }

    // Redis transfer 
    const { data: supaCourses, error: error2 } = await supabase
        .from("courses")
        .select("*")
        .eq("term", term)
        .order("code", { ascending: true });

    if (error2) {
        throw new Error(error2.message);
    }

    const { data: supaSections, error: error3 } = await supabase
        .from("sections")
        .select("*, courses!inner(term)")
        .eq("courses.term", term)
        .order("id", { ascending: true });

    if (error3) {
        throw new Error(error3.message);
    }

    supaSections.forEach((section) => {
        delete section.courses;
    });
    
    // Push term data to Redis
    const redisClient = createClient({
        password: REDIS_PASSWORD,
        socket: {
        host: 'redis-10705.c12.us-east-1-4.ec2.cloud.redislabs.com',
        port: 10705
        }
    });

    redisClient.on("error", err => console.log("Redis Client Error", err));

    await redisClient.connect();
    await redisClient.json.set(`courses-${term}`, "$", supaCourses)
    await redisClient.json.set(`sections-${term}`, "$", supaSections);
    await redisClient.disconnect();

    console.log("Finished populating courses in", Date.now() - startTime, "ms");
}


//------------------ Helper Functions ------------------//

const calculateGradingInfo = (data: any) => {
    let gradingInfo: Record<string, string> = {};
    for (let key in GENERIC_GRADING_INFO) 
        if (data[key] && data[key] !== "0")
            gradingInfo[GENERIC_GRADING_INFO[key as keyof RegGradingInfo]] 
        = data[key];
    
    return gradingInfo;
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

const daysToValue = (days: string[]) => {
    let value = 0;
    if (days.includes("M")) value += 1;
    if (days.includes("T")) value += 2;
    if (days.includes("W")) value += 4;
    if (days.includes("Th")) value += 8;
    if (days.includes("F")) value += 16;
    return value;
}