// @ts-nocheck
/**
 * @fileoverview Scraper for updating ONLY enrollment data rapidly.
 * Meant to be run on a local machine during extremely critical times
 * (e.g. during registration period, start of add-drop) where the
 * enrollment numbers need to be updated every minute (or faster).
 * ! DO NOT RUN THIS SCRIPT ON THE SERVER!!!
 */

import { COURSE_URL, TERM_URL } from "$lib/constants";
import { getToken } from "./getToken";
import { createClient } from "redis";
import { REDIS_PASSWORD } from "$env/static/private";

/**
 * Updates the enrollment numbers for all courses in the Redis database
 * for the given term
 * @param {any} supabase
 * @param {number} term
 */
export const updateEnrollments = async (supabase, term) => {
    // Get supabase data
    const { data: courseHeap, error: error2 } = await supabase
        .from("courses")
        .select("*")
        .eq("term", term)
        .order("code", { ascending: true });

    if (error2) {
        console.log("Error fetching courses from Supabase.");
        throw new Error(error2.message);
    }

    const { data: sectionHeap, error: error3 } = await supabase
        .from("sections")
        .select("*, courses!inner(term)")
        .eq("courses.term", term)
        .order("id", { ascending: true });

    if (error3) {
        console.log("Error fetching sections from Supabase.");
        throw new Error(error3.message);
    }

    sectionHeap.forEach(section => {
        delete section.courses;
    });

    // Create Redis client
    const redisClient = createClient({
        password: REDIS_PASSWORD,
        socket: {
            host: "redis-10705.c12.us-east-1-4.ec2.cloud.redislabs.com",
            port: 10705
        }
    });

    redisClient.on("error", err => console.log("Redis Client Error", err));
    await redisClient.connect();

    let globCount = 0;

    //------------------------------------------------------------------
    // Individual Course Processing
    //------------------------------------------------------------------
    const processCourse = async (index, token) => {
        // Check base case
        if (index >= courseHeap.length) return;
        globCount++;

        // Get specific course data
        const resRaw = await fetch(
            `${COURSE_URL}term=${term}&course_id=${courseHeap[index].listing_id}`,
            {
                method: "GET",
                headers: {
                    Authorization: token
                }
            }
        );
        const res = await resRaw.json();

        if (
            !res ||
            !res.course_details ||
            !res.course_details.course_detail ||
            res.course_details.course_detail.length === 0
        ) {
            console.error("Error fetching course data: " + index);

            // Wait for PARALLEL_WAIT_TIME + random noise
            await new Promise(resolve =>
                setTimeout(
                    resolve,
                    CYCLE_WAIT_TIME +
                        PARALLEL_WAIT_TIME +
                        Math.random() * WAIT_TIME_NOISE
                )
            );

            // Try again
            await processCourse(index, token);
            return;
        }

        const course = res.course_details.course_detail[0];
        if (course.course_sections.course_section) {
            const sections = course.course_sections.course_section;
            for (let k = 0; k < sections.length; k++) {
                const section = sections[k];
                const sectionIndex = sectionHeap.findIndex(
                    section2 => section2.num === parseInt(section.class_number)
                );

                if (sectionIndex >= 0) {
                    // Check if enrollment numbers have changed
                    if (
                        parseInt(section.enrl_tot) ===
                            sectionHeap[sectionIndex].tot &&
                        parseInt(section.enrl_cap) ===
                            sectionHeap[sectionIndex].cap
                    ) {
                        continue;
                    }

                    sectionHeap[sectionIndex].tot = parseInt(section.enrl_tot);
                    sectionHeap[sectionIndex].cap = parseInt(section.enrl_cap);
                    sectionHeap[sectionIndex].status =
                        parseInt(section.enrl_cap) === 0
                            ? 2
                            : parseInt(section.enrl_tot) >=
                                parseInt(section.enrl_cap)
                              ? 1
                              : 0;

                    // Update supabase
                    await supabase
                        .from("sections")
                        .update({
                            tot: sectionHeap[sectionIndex].tot,
                            cap: sectionHeap[sectionIndex].cap,
                            status: sectionHeap[sectionIndex].status
                        })
                        .eq("id", sectionHeap[sectionIndex].id);
                }
            }
        }

        // Wait for PARALLEL_WAIT_TIME + random noise
        await new Promise(resolve =>
            setTimeout(
                resolve,
                PARALLEL_WAIT_TIME + Math.random() * WAIT_TIME_NOISE
            )
        );

        // Recurse
        await processCourse(index + PARALLEL_PROCESSES, token);
    };

    //------------------------------------------------------------------
    // Cycle
    //------------------------------------------------------------------

    const PARALLEL_PROCESSES = 2; // Number of parallel processes
    const PARALLEL_WAIT_TIME = 200; // Mean waiting time between parallel processes (ms)
    const WAIT_TIME_NOISE = 25; // Random noise in waiting time (ms)
    const CYCLE_WAIT_TIME = 20000; // Waiting time between cycles (ms)
    let cycleCount = 0; // Number of cycles completed

    const cycle = async () => {
        // Update courseHeap with refreshed data
        const token = await getToken();

        const rawCourselist = await fetch(`${TERM_URL}${term}`, {
            method: "GET",
            headers: {
                Authorization: token
            }
        });

        const courseList = await rawCourselist.json();
        const regCourses = courseList.classes.class.map(course => {
            return {
                id: course.course_id,
                status: calculateStatus(course.calculated_status)
            };
        });

        // Update course statuses
        courseHeap.forEach(course => {
            const regCourse = regCourses.find(
                regCourse => regCourse.id === course.listing_id
            );
            if (regCourse) course.status = regCourse.status;
        });

        const updateSupaCourse = async index => {
            if (index >= courseHeap.length) return;
            await supabase
                .from("courses")
                .update({
                    status: courseHeap[index].status
                })
                .eq("id", courseHeap[index].id);
            await new Promise(resolve =>
                setTimeout(resolve, Math.random() * WAIT_TIME_NOISE)
            );
            await updateSupaCourse(index + PARALLEL_PROCESSES);
        };

        // Update supabase in parallel
        for (let i = 0; i < PARALLEL_PROCESSES; i++) {
            updateSupaCourse(i);
        }

        await redisClient.json.set(`courses-${term}`, "$", courseHeap);

        globCount = 0;
        // Update sectionHeap with refreshed data (parallel)
        for (let i = 0; i < PARALLEL_PROCESSES; i++) {
            processCourse(i, token, PARALLEL_PROCESSES);
            await new Promise(resolve =>
                setTimeout(
                    resolve,
                    PARALLEL_WAIT_TIME + Math.random() * WAIT_TIME_NOISE
                )
            );
        }

        // wait for all processes to finish
        while (globCount < courseHeap.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log("Processed " + globCount + " courses.");

        // Push sectionHeap to Redis once all processes are done
        await redisClient.json.set(`sections-${term}`, "$", sectionHeap);

        cycleCount++;
    };

    console.log("Starting scraper for term " + term + "...");

    // Lock in infinite loop
    while (true) {
        let startTime = Date.now();
        await cycle();
        let timeElapsed = (Date.now() - startTime) / 1000;
        console.log(
            "Cycle " + cycleCount + " completed in " + timeElapsed + " seconds."
        );
        await new Promise(resolve => setTimeout(resolve, CYCLE_WAIT_TIME));
    }
};

/**
 * Convert to numberic status for course.
 * @param {string} status
 * @returns {number}
 */
const calculateStatus = status => {
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
};
