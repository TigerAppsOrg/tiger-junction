// @ts-nocheck
/**
 * @fileoverview Scraper for updating ONLY enrollment data rapidly.
 * Meant to be run on a local machine during extremely critical times
 * (e.g. during registration period, start of add-drop) where the
 * enrollment numbers need to be updated every minute (or faster).
 */

import { COURSE_URL, TERM_URL } from "$lib/constants";
import { getToken } from "./getToken"

/**
 * Updates the enrollment numbers for all courses in the Redis database 
 * for the given term.
 * @param {any} supabase 
 * @param {number} term 
 */
export const updateEnrollments = async(supabase, term) => {
    // Get supabase data
    const { data: courseHeap, error: error2 } = await supabase
        .from("courses")
        .select("*")
        .eq("term", term)
        .order("code", { ascending: true });

    if (error2) {
        console.log("Error fetching courses from Supabase.")
        throw new Error(error2.message);
    }

    const { data: sectionHeap, error: error3 } = await supabase
        .from("sections")
        .select("*, courses!inner(term)")
        .eq("courses.term", term)
        .order("id", { ascending: true });

    if (error3) {
        console.log("Error fetching sections from Supabase.")
        throw new Error(error3.message);
    }

    sectionHeap.forEach((section) => {
        delete section.courses;
    });

    // Create Redis client
    const redisClient = createClient({
        password: REDIS_PASSWORD,
        socket: {
            host: 'redis-10705.c12.us-east-1-4.ec2.cloud.redislabs.com',
            port: 10705
        }
    });

    redisClient.on("error", err => console.log("Redis Client Error", err));
    await redisClient.connect();
    
    //------------------------------------------------------------------
    // Individual Course Processing
    //------------------------------------------------------------------
    const processCourse = async (index, token) => {
        // Check base case
        if (index >= courseList.length) return;
        count++;

        // Get specific course data
        const resRaw = await fetch(
            `${COURSE_URL}term=${term}&course_id=${newCourses[index].id}`, {
                method: "GET",
                headers: {
                    "Authorization": token
                }
            }
        );
        const res = await resRaw.json();

        if (!res || !res.course_details || !res.course_details.course_detail
        || res.course_details.course_detail.length === 0) {
            console.error("Error fetching course data: " + index);
            return;
        }

        // Format Course Data
        const data = res.course_details.course_detail[0];
        const course = {
            
        }
    }

    //------------------------------------------------------------------
    // Cycle
    //------------------------------------------------------------------

    const PARALLEL_PROCESSES = 20;  // Number of parallel processes
    const PARALLEL_WAIT_TIME = 50;  // Mean waiting time between parallel processes (ms)
    const WAIT_TIME_NOISE = 10;     // Random noise in waiting time (ms)
    const CYCLE_WAIT_TIME = 5000;   // Waiting time between cycles (ms)
    let cycleCount = 0              // Number of cycles completed

    const cycle = async () => {
        // Update courseHeap with refreshed data
        const token = await getToken();

        const rawCourselist = await fetch(`${TERM_URL}${term}`, {
            method: "GET",
            headers: {
                "Authorization": token
            }
        });

        const regCourses = (await rawCourselist.json()).classes.class.map((course) => {
            return {
                id: course.course_id,
                status: calculateStatus(course.calculateStatus),
            }
        });

        // Update course statuses
        courseHeap.forEach((course) => {
            const regCourse = regCourses.find((regCourse) => regCourse.id === course.listing_id);
            if (regCourse) course.status = regCourse.status;
        });

        // Push courseHeap to Supabase and Redis
        await supabase.from("courses").upsert(courseHeap);
        await redisClient.json.set(`courses-${term}`, "$", courseHeap);

        // Update sectionHeap with refreshed data (parallel)

        cycleCount++;
    }

    // Lock in infinite loop
    while (true) {
        let startTime = Date.now();
        await cycle();
        let timeElapsed = (Date.now() - startTime) / 1000;
        console.log("Cycle " + cycleCount + " completed in " + timeElapsed + " seconds.");
        await new Promise((resolve) => setTimeout(resolve, CYCLE_WAIT_TIME));
    }
}

/**
 * Convert to numberic status for course.
 * @param {string} status 
 * @returns {number}
 */
const calculateStatus = (status) => {
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