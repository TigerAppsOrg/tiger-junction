import { API_ACCESS_TOKEN, REDIS_PASSWORD } from "$env/static/private";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "redis";
import * as fs from "node:fs";

/**
 * 
 * @param supabase
 * @param term 
 */
export const updateSeats = async (supabase: SupabaseClient, term: number) => {

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

    const courseIds = courseHeap.map(course => course.listing_id);
    const courseIdsLength = courseIds.length;
    const partOneOfFour = courseIds.slice(0, courseIdsLength / 4).join(",");
    const partTwoOfFour = courseIds.slice(courseIdsLength / 4, courseIdsLength / 2).join(",");
    const partThreeOfFour = courseIds.slice(courseIdsLength / 2, courseIdsLength * 3 / 4).join(",");
    const partFourOfFour = courseIds.slice(courseIdsLength * 3 / 4).join(",");

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

    const cycle = async () => {
        const WAITING_TIME = 1000;

        const startTime = Date.now();
        const res1 = await fetch(
            `https://api.princeton.edu/student-app/courses/seats?term=1244&fmt=json&course_ids=${partOneOfFour}`, {
                method: "GET",
                headers: {
                    "Authorization": API_ACCESS_TOKEN
                }
            }
        );

        await new Promise(resolve => setTimeout(resolve, WAITING_TIME));

        const res2 = await fetch(
            `https://api.princeton.edu/student-app/courses/seats?term=1244&fmt=json&course_ids=${partTwoOfFour}`, {
                method: "GET",
                headers: {
                    "Authorization": API_ACCESS_TOKEN
                }
            }
        );

        await new Promise(resolve => setTimeout(resolve, WAITING_TIME));

        const res3 = await fetch(
            `https://api.princeton.edu/student-app/courses/seats?term=1244&fmt=json&course_ids=${partThreeOfFour}`, {
                method: "GET",
                headers: {
                    "Authorization": API_ACCESS_TOKEN
                }
            }
        );

        await new Promise(resolve => setTimeout(resolve, WAITING_TIME));


        const res4 = await fetch(
            `https://api.princeton.edu/student-app/courses/seats?term=1244&fmt=json&course_ids=${partFourOfFour}`, {
                method: "GET",
                headers: {
                    "Authorization": API_ACCESS_TOKEN
                }
            }
        );

        await new Promise(resolve => setTimeout(resolve, WAITING_TIME));

        const data1 = await res1.json();
        const data2 = await res2.json();
        const data3 = await res3.json();
        const data4 = await res4.json();

        // Read data from src/lib/scripts/scraper/localcache/seatcache.json
        // const data: SeatInfo[] = JSON.parse(fs.readFileSync("src/lib/scripts/scraper/localcache/seatcache.json", "utf-8"));

        type SeatInfo = {
            course_id: string,
            classes: ClassSeatInfo[]
        }

        type ClassSeatInfo = {
            "class_number": string
            "capacity": string,
            "enrollment": string,
            "status": string
            "pu_calc_status": string
            "seat_status": string
        }

        const data: SeatInfo[] = [...data1.course, ...data2.course, ...data3.course, ...data4.course];
        let numUpdates = 0;
        let closures = 0;

        // Update the section heap 
        for (let i = 0; i < data.length; i++) {
            const course = data[i];
            for (let j = 0; j < course.classes.length; j++) {
                const sectionIndex = sectionHeap.findIndex(section => {
                    return section.num === parseInt(course.classes[j].class_number)
                });

                if (sectionIndex === -1) {
                    console.log("Section not found: ", course.classes[j].class_number);
                    console.log("Course: ", course.course_id)
                    continue;
                };

                const section = sectionHeap[sectionIndex];
                const newTot = parseInt(course.classes[j].enrollment);
                const newCap = parseInt(course.classes[j].capacity);
                const newStatus = convertStatus(course.classes[j].status);

                if (section.tot !== newTot || section.cap !== newCap || section.status !== newStatus) {
                    sectionHeap[sectionIndex].tot = newTot;
                    sectionHeap[sectionIndex].cap = newCap;
                    sectionHeap[sectionIndex].status = newStatus;

                    numUpdates++;

                    // Update the section in supabase
                    await supabase.from("sections").update({
                        tot: sectionHeap[sectionIndex].tot,
                        cap: sectionHeap[sectionIndex].cap,
                        status: sectionHeap[sectionIndex].status
                    })
                    .eq("id", sectionHeap[sectionIndex].id);

                    // Calculate course status
                    const course = courseHeap.find(course => course.id === section.course_id);
                    if (!course) {
                        console.log("Course not found: ", section.course_id);
                        continue;
                    }


                    const sections = sectionHeap.filter(section => section.course_id === course.id);
                    const categories = [...new Set(sections.map(section => section.category))];
                    let isOpen = 0;

                    for (let c = 0; c < categories.length; c++) {
                        const categorySections = sections.filter(section => 
                            section.category === categories[c]);
                        const categoryClosed = categorySections.every(section => 
                            section.status === 1);
                        if (categoryClosed) {
                            closures++;
                            isOpen = 1;
                            break;
                        }
                    }

                    course.status = isOpen;
                    const { error: newErr} = await supabase.from("courses").update({
                        status: course.status
                    }).eq("id", course.id);

                    if (newErr) {
                        console.log("Error updating course status in supabase");
                        throw new Error(newErr.message);
                    }
                }
            }
        }

        // Update the redis cache
        await redisClient.json.set(`sections-${term}`, "$", sectionHeap);
        await redisClient.json.set(`courses-${term}`, "$", courseHeap);
        console.log("Number of updates:", numUpdates, "Time taken:", Date.now() - startTime, "Closures:", closures);
    }

    // Infinite loop
    let count = 0;
    const CYCLE_PAUSE = 10000;
    while (true) {
        console.log("Cycle", ++count);
        await cycle();
        await new Promise(resolve => setTimeout(resolve, CYCLE_PAUSE));
    }
}

const convertStatus = (status: string) => {
    switch (status) {
        case "O":
            return 0;
        case "C":
            return 1;
        default:
            return 0;
    }
}