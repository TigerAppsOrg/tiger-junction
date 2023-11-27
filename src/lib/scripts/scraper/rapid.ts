import type { SupabaseClient } from "@supabase/supabase-js";
import { getToken } from "./getToken";
import { COURSE_URL, TERM_URL } from "$lib/constants";
import { createClient } from "redis";
import { REDIS_PASSWORD } from "$env/static/private";
import type { RegCourse } from "$lib/types/regTypes";

/**
 * Rapidly update the course numbers until the process is terminated 
 * manually
 * @param supabase 
 * @param term 
 */
const rapidUpdate = async (supabase: SupabaseClient, term: number) => {
    const token = await getToken();

    // Fetch all courses
    const { data: courses, error } = await supabase
        .from("courses")
        .select("*")
        .eq("term", term)
        .order("code", { ascending: true });

    if (error) {
        throw new Error(error.message);
    }

    const redisClient = createClient({
        password: REDIS_PASSWORD,
        socket: {
          host: 'redis-10705.c12.us-east-1-4.ec2.cloud.redislabs.com',
          port: 10705
        }
    });

    /**
     * Cycle through all the courses and update enrollment numbers
     */
    const cycle = async () => {
        const rawCourselist = await fetch(`${TERM_URL}${term}`, {
            method: "GET",
            headers: {
                "Authorization": token
            }
        });
        const jsonCourseList = await rawCourselist.json();
        if (!jsonCourseList || !jsonCourseList.classes 
            || !jsonCourseList.classes.class) {
            throw new Error("No courses found");
        }

        let courseList = jsonCourseList.classes.class.map((x: any) => {
            return {
                id: x.course_id,
                status: calculateStatus(x.calculated_status)
            }
        });

        

    } 

    /**
     * 
     * @param courseId 
     */
    const process = async (courseId: number) => {
        const courseDetailsRaw = await fetch(
            `${COURSE_URL}term=${term}&course_id=${courseId}`, {
                method: "GET",
                headers: {
                    "Authorization": token
                }
            }
        ); 

        const courseDetails = await courseDetailsRaw.json();
        if (!courseDetails 
            || !courseDetails.course_details
            || !courseDetails.course_details.course_detail
            || courseDetails.course_details.course_detail.length === 0) {
                console.log(`Course ${courseId} not found`);
                throw new Error(`Course ${courseId} not found`);
        }

        const course: RegCourse = courseDetails.course_details.course_detail[0];


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