import { API_ACCESS_TOKEN, REDIS_PASSWORD } from "$env/static/private";
import { DEPARTMENTS, TERM_URL } from "$lib/constants";
import type { CourseInsert } from "$lib/types/dbTypes";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getToken } from "./getToken";
import { timeToValue } from "../convert";
import { createClient } from "redis";

export const populateCourses = async (
    supabase: SupabaseClient,
    term: number
) => {
    console.log("Populating courses for term", term);

    const token = await getToken();
    // Fetch all course ids and open status for the given term
    const rawCourselist = await fetch(`${TERM_URL}${term}`, {
        method: "GET",
        headers: {
            Authorization: token
        }
    });

    type RegCourse = {
        listing_id: string;
        code: string;
        dists: string[] | null;
    };

    const jsonCourselist = await rawCourselist.json();
    const courselist: RegCourse[] = jsonCourselist.classes.class.map(
        (x: any) => {
            return {
                listing_id: x.course_id,
                code: x.crosslistings.replace(/\s/g, ""),
                dists: x.distribution_area
                    ? x.distribution_area.split(" or ").sort()
                    : null
            };
        }
    );

    const startTime = Date.now();
    for (let i = 0; i < DEPARTMENTS.length; i++) {
        const subject = DEPARTMENTS[i];
        const subjectStartTime = Date.now();
        console.log("Populating", subject);

        const rawSubjectData = await fetch(
            `https://api.princeton.edu/student-app/courses/courses?term=${term}&fmt=json&subject=${subject}`,
            {
                method: "GET",
                headers: {
                    Authorization: API_ACCESS_TOKEN
                }
            }
        );

        let subjectData = await rawSubjectData.json();
        if (!subjectData.term[0].subjects) {
            console.log("No data for term", term, ":", subject);
            continue;
        }
        subjectData = subjectData.term[0];

        // Find the index in the subjects array that matches the subject
        // (when querying for a subject, the crosslists are also included)
        const correctIndex = subjectData.subjects.findIndex(
            (x: any) => x.code === subject
        );
        if (correctIndex === -1) {
            console.log("Subject not found for term", term, ":", subject);
            continue;
        }
        subjectData = subjectData.subjects[correctIndex].courses;

        // Iterate through all courses in the subject
        for (let j = 0; j < subjectData.length; j++) {
            const courseIdCodeDist = courselist.find(
                (x: any) => x.listing_id === subjectData[j].course_id
            );
            if (!courseIdCodeDist) {
                console.log(
                    "No courselist entry for",
                    subjectData[j].course_id,
                    "in term",
                    term
                );
                continue;
            }
            const courseSubjectDetails = subjectData[j];

            // Fetch individual course details
            const rawCourseDetails = await fetch(
                `https://api.princeton.edu/student-app/1.0.3/courses/details?term=${term}&course_id=${subjectData[j].course_id}&fmt=json`,
                {
                    method: "GET",
                    headers: {
                        Authorization: token
                    }
                }
            );

            const courseDetails = await rawCourseDetails.json();
            if (
                !courseDetails ||
                !courseDetails.course_details ||
                !courseDetails.course_details.course_detail
            ) {
                console.log(
                    "No course details for",
                    courseSubjectDetails.course_id,
                    "in term",
                    term
                );
                continue;
            }

            const courseDetail = courseDetails.course_details.course_detail;
            const basis: string = courseDetail.grading_basis;
            const hasFinal =
                courseDetail.grading_final_exam &&
                parseInt(courseDetail.grading_final_exam) > 0;

            // Calculate course status
            const sections: any[] = courseSubjectDetails.classes;
            const sectionMap: Record<string, boolean> = {};
            let allCancelled = true;
            type Status = "Open" | "Closed" | "Canceled";
            for (let k = 0; k < sections.length; k++) {
                const section = sections[k];
                const sectionStatus: Status = section.status;
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
            const course: CourseInsert = {
                listing_id: courseIdCodeDist.listing_id,
                term: term,
                code: courseIdCodeDist.code,
                title: courseSubjectDetails.title,
                has_final: hasFinal,
                status: status,
                basis: basis,
                dists: courseIdCodeDist.dists,
                instructors: courseSubjectDetails.instructors
                    ? courseSubjectDetails.instructors.map(
                          (x: any) => x.full_name
                      )
                    : null
            };

            // Check if course exists in supabase
            const { data: exisCourse, error: exisCError } = await supabase
                .from("courses")
                .select("id")
                .eq("listing_id", course.listing_id)
                .eq("term", course.term);

            if (exisCError) {
                console.log(
                    "Error checking if course exists in supabase for",
                    course.listing_id,
                    "in term",
                    course.term
                );
                throw new Error(exisCError.message);
            }

            let courseId: number;

            if (exisCourse.length > 0) {
                const { error } = await supabase
                    .from("courses")
                    .update(course)
                    .eq("id", exisCourse[0].id);

                if (error) {
                    console.log(
                        "Error updating course",
                        course.listing_id,
                        "in term",
                        course.term
                    );
                    throw new Error(error.message);
                }

                courseId = exisCourse[0].id;
            } else {
                const { data, error } = await supabase
                    .from("courses")
                    .insert(course)
                    .select("id");

                if (error) {
                    console.log(
                        "Error inserting course",
                        course.listing_id,
                        "in term",
                        course.term
                    );
                    throw new Error(error.message);
                }

                if (!data) {
                    console.log(
                        "No data returned from inserting course",
                        course.listing_id,
                        "in term",
                        course.term
                    );
                    continue;
                }
                courseId = data[0].id;
            }

            for (let k = 0; k < sections.length; k++) {
                const section = sections[k];

                const room =
                    section.building && section.room
                        ? section.building + " " + section.room
                        : null;

                for (let l = 0; l < section.schedule.meetings.length; l++) {
                    const meeting = section.schedule.meetings[l];
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
                        status:
                            section.status === "Open"
                                ? 0
                                : section.status === "Closed"
                                  ? 1
                                  : 2
                    };

                    // Check if section exists in supabase
                    const { data: exisSection, error: exisSError } =
                        await supabase
                            .from("sections")
                            .select("id")
                            .eq("course_id", sectionData.course_id)
                            .eq("num", sectionData.num);

                    if (exisSError) {
                        console.log(
                            "Error checking if section exists in supabase for",
                            sectionData.course_id,
                            "in term",
                            term
                        );
                        throw new Error(exisSError.message);
                    }

                    if (exisSection.length > 0) {
                        const { error } = await supabase
                            .from("sections")
                            .update(sectionData)
                            .eq("id", exisSection[0].id);

                        if (error) {
                            console.log(
                                "Error updating section",
                                sectionData.course_id,
                                "in term",
                                term
                            );
                            throw new Error(error.message);
                        }
                    } else {
                        const { error } = await supabase
                            .from("sections")
                            .insert(sectionData);

                        if (error) {
                            console.log(
                                "Error inserting section",
                                sectionData.course_id,
                                "in term",
                                term
                            );
                            throw new Error(error.message);
                        }
                    }
                }
            }
        }

        console.log(
            "Finished populating",
            subject,
            "in",
            Date.now() - subjectStartTime,
            "ms"
        );
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

    supaSections.forEach(section => {
        delete section.courses;
    });

    // Push term data to Redis
    const redisClient = createClient({
        password: REDIS_PASSWORD,
        socket: {
            host: "redis-10705.c12.us-east-1-4.ec2.cloud.redislabs.com",
            port: 10705
        }
    });

    redisClient.on("error", err => console.log("Redis Client Error", err));

    await redisClient.connect();
    await redisClient.json.set(`courses-${term}`, "$", supaCourses);
    await redisClient.json.set(`sections-${term}`, "$", supaSections);
    await redisClient.disconnect();

    console.log("Finished populating courses in", Date.now() - startTime, "ms");
};

const daysToValue = (days: string[]) => {
    let value = 0;
    if (days.includes("M")) value += 1;
    if (days.includes("T")) value += 2;
    if (days.includes("W")) value += 4;
    if (days.includes("Th")) value += 8;
    if (days.includes("F")) value += 16;
    return value;
};
