import { API_ACCESS_TOKEN, REDIS_PASSWORD } from "$env/static/private";
import { DEPARTMENTS, TERM_URL } from "$lib/constants";
import type { CourseInsert } from "$lib/types/dbTypes";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getToken } from "./getToken";
import { timeToValue } from "../convert";
import { createClient } from "redis";

type RegCourse = {
    listing_id: string,
    code: string,
    dists: string[] | null
}

export const getAllCourses = async (supabase: SupabaseClient, term: number) => {
    console.log("Populating courses for term", term);

    // Fetch all course ids and open status for the given term
    const token = await getToken();
    const rawCourselist = await fetch(`${TERM_URL}${term}`, {
        method: "GET",
        headers: {
            "Authorization": token
        }
    });

    const jsonCourselist = await rawCourselist.json();
    const courselist: RegCourse[] = jsonCourselist.classes.class.map((x: any) => {
        return {
            listing_id: x.course_id,
            code: x.crosslistings.replace(/\s/g, ""),
            dists: x.distribution_area ?
                x.distribution_area.split(" or ").sort() :
                null,
        }
    });

    const startTime = Date.now();

    /**
     * Fetch course data for courses in the given subject (department)
     * @param subject The department to fetch data for
     */
    const handleDepartment = async (subject: string, waitTime: number) => {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        const rawSubjectData = await fetch(
            `https://api.princeton.edu/student-app/courses/courses?term=${term}&fmt=json&subject=${subject}`, {
                method: "GET",
                headers: {
                    "Authorization": API_ACCESS_TOKEN
                }
            }
        );

        console.log("Fetched data for: ", subject)

        let subjectData = await rawSubjectData.json();
        if (!subjectData.term[0].subjects) {
            console.log("No data for term", term, ":", subject);
            return;
        }
        subjectData = subjectData.term[0];

        // Find the index in the subjects array that matches the subject
        // (when querying for a subject, the crosslists are also included)
        let correctIndex = subjectData.subjects.findIndex((x: any) => x.code === subject);
        if (correctIndex === -1) {
            console.log("Subject not found for term", term, ":", subject);
            return;
        };
        subjectData = subjectData.subjects[correctIndex].courses;

        /**
         * Fetch course data for a given course
         * @param courseSubjectDetails
         */
        const handleCourse = async (courseSubjectDetails: any, waitTime: number) => {
            await new Promise(resolve => setTimeout(resolve, waitTime));

            const courseIdCodeDist = courselist.find(x => 
                x.listing_id === courseSubjectDetails.course_id);
            if (!courseIdCodeDist) {
                console.log("Course not found for term", term, ":", courseSubjectDetails.course_id);
                return;
            }
            
            // Fetch individual course details
            let rawCourseDetails;
            let courseDetails;

            if (courseIdCodeDist.listing_id !== "010855") {
                rawCourseDetails = await fetch(
                    `https://api.princeton.edu/student-app/1.0.3/courses/details?term=${term}&course_id=${courseSubjectDetails.course_id}&fmt=json`, {
                        method: "GET",
                        headers: {
                            "Authorization": token
                        }
                    }
                );
                courseDetails = await rawCourseDetails.json();
            } else {
                courseDetails = {
                    course_details: {
                        course_detail: {
                            grading_basis: "NAU",
                            grading_final_exam: "0"
                        }
                    }
                }
            }

            if (!courseDetails || !courseDetails.course_details || !courseDetails.course_details.course_detail) {
                console.log("No course details for", courseSubjectDetails.course_id, "in term", term);
                return;
            }

            const courseDetail = courseDetails.course_details.course_detail;
            const basis: string = courseDetail.grading_basis;
            const hasFinal = courseDetail.grading_final_exam && 
            parseInt(courseDetail.grading_final_exam) > 0;

            // Calculate course status
            const sections: any[] = courseSubjectDetails.classes;
            const sectionMap: Record<string, boolean> = {};
            let allCancelled = true;
            type Status = "Open" | "Closed" | "Canceled";
            for (let k = 0; k < sections.length; k++) {
                const section = sections[k];
                const sectionStatus: Status = section.pu_calc_status;
                const sectionType: string = section.section[0];
                if (sectionStatus !== "Canceled") {
                    allCancelled = false;
                }
                if (sectionStatus === "Open") {
                    sectionMap[sectionType] = true;
                }
                if (!sectionMap[sectionType] && sectionStatus[0] === "C") {
                    sectionMap[sectionType] = false;
                }
            }
            let status: 0 | 1 | 2 | 3 = 0;
            if (allCancelled) {
                status = 2;
            } else {
                for (const key in sectionMap) {
                    if (!sectionMap[key]) {
                        status = 1;
                        break;
                    }
                }
            }

            // Update course
            let course: CourseInsert = {
                listing_id: courseIdCodeDist.listing_id,
                term: term,
                code: courseIdCodeDist.code,
                title: courseSubjectDetails.title,
                has_final: hasFinal,
                status: status,
                basis: basis,
                dists: courseIdCodeDist.dists,
                instructors: courseSubjectDetails.instructors ? 
                    courseSubjectDetails.instructors.map((x: any) => {
                        return x.full_name.split(" ").map((x: string) =>
                            x[0].toUpperCase() + x.slice(1)).join(" ");
                    }) : 
                    null,
            }

            // Check if course exists in supabase
            const { data: exisCourse, error: exisCError } = await supabase.from("courses")
                .select("id")
                .eq("listing_id", course.listing_id)
                .eq("term", course.term)
                .order("id", { ascending: true })

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

                if (!data) {
                    console.log("No data returned from inserting course", course.listing_id, "in term", course.term);
                    return;
                }
                courseId = data[0].id;
            }

            for (let k = 0; k < sections.length; k++) {
                let section = sections[k];

                for (let l = 0; l < section.schedule.meetings.length; l++) {
                    const meeting = section.schedule.meetings[l];

                    const room = meeting.building && meeting.building.name && meeting.room ? 
                        meeting.building.name + " " + meeting.room : 
                        null;

                    const sectionData = {
                        course_id: courseId,
                        title: section.section,
                        category: section.section[0],
                        num: section.class_number,
                        room: room,
                        tot: section.enrollment,
                        cap: section.capacity,
                        days: daysToValue(meeting.days),
                        start_time: timeToValue(meeting.start_time),
                        end_time: timeToValue(meeting.end_time),
                        status: section.pu_calc_status === "Open" ? 0 :
                            section.pu_calc_status === "Closed" ? 1 : 2,
                    }

                    // Check if section exists in supabase
                    const { data: exisSection, error: exisSError } = await supabase.from("sections")
                        .select("id")
                        .eq("course_id", sectionData.course_id)
                        .eq("num", sectionData.num)
                        .order("id", { ascending: true })

                    if (exisSError) {
                        console.log("Error checking if section exists in supabase for", sectionData.course_id, "in term", term);
                        throw new Error(exisSError.message);
                    }
                    
                    if (exisSection[l] !== undefined) {
                        let { error } = await supabase
                            .from("sections")
                            .update(sectionData)
                            .eq("id", exisSection[l].id)

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
        } // ? End handleCourse

        // Fetch data for each course in the subject in parallel with a delay
        const PARALLEL_REQUESTS = 6;
        const WAIT_INTERVAL = 3000;
        const courseChunks: Record<string, number>[] = [];
        for (let i = 0; i < subjectData.length; i += PARALLEL_REQUESTS) {
            const tempArr: any[] = subjectData.slice(i, i + PARALLEL_REQUESTS);
            const tempObj: Record<string, number> = {};
            tempArr.forEach((x, i) => tempObj[x.course_id] = i * WAIT_INTERVAL);
            courseChunks.push(tempObj);
        }

        for (let i = 0; i < courseChunks.length; i++) {
            await Promise.all(Object.keys(courseChunks[i]).map(x => 
                handleCourse(subjectData.find((y: any) => 
                    y.course_id === x), courseChunks[i][x])));
        }

    } // ? End handleDepartment

    // Fetch data for each department in parallel
    const PARALLEL_REQUESTS = 6;
    const WAIT_INTERVAL = 2000;
    const departmentChunks: Record<string, number>[] = [];
    for (let i = 0; i < DEPARTMENTS.length; i += PARALLEL_REQUESTS) {
        const tempArr: string[] = DEPARTMENTS.slice(i, i + PARALLEL_REQUESTS);
        const tempObj: Record<string, number> = {};
        tempArr.forEach((x, i) => tempObj[x] = i * WAIT_INTERVAL);
        departmentChunks.push(tempObj);
    }

    for (let i = 0; i < departmentChunks.length; i++) {
        await Promise.all(Object.keys(departmentChunks[i]).map(x => handleDepartment(x, departmentChunks[i][x])));
        console.log("Finished fetching data for", departmentChunks[i]);
    }

    const endTime = Date.now();

    console.log("Finished fetching courses for term", term, "in", endTime - startTime, "ms");

    // Transfer data from Supabase to Redis
    const redisStart = Date.now(); 
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

    const redisEnd = Date.now();
    console.log("Finished transferring data to Redis for term", term, "in", redisEnd - redisStart, "ms");
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