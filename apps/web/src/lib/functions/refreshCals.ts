// Cron job to refresh calendars every day
import { createClient } from "@supabase/supabase-js";
import { createEvents, type DateArray, type EventAttributes } from "ics";
import { calculateStart, valueToRRule } from "$lib/scripts/ReCal+/ical";
import { CALENDAR_INFO } from "$lib/changeme.js";
import { config } from "dotenv";
import { Database } from "$lib/types/supabaseTypes";

export async function handler() {
    config();
    // Environment variables are loaded into AWS Lambda manually
    const supabase = createClient<Database>(
        process.env.PUBLIC_SUPABASE_URL as string,
        process.env.SERVICE_KEY as string,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );

    console.log("Getting calendars...");
    let startTime = Date.now();
    const { data, error } = await supabase
        .from("icals")
        .select(
            `
            *,
            schedules (id, term,
                course_schedule_associations ( metadata->confirms,
                    courses (code, title, instructors,
                        sections (
                            start_time, end_time, days, title, room
                        )
                    )
                )
            )
        `
        )
        .not("schedule_id", "is", null);

    if (error) {
        console.error(error);
        return new Response(JSON.stringify(error), { status: 500 });
    }

    if (!data) {
        console.error("No data found.");
        return new Response("No data found.", { status: 404 });
    }

    console.log(
        "Found " +
            data.length +
            " calendars in " +
            (Date.now() - startTime) / 1000 +
            "s"
    );
    const upsertPromises: Promise<unknown>[] = [];

    startTime = Date.now();
    // Loop through each schedule
    for (let i = 0; i < data.length; i++) {
        const events: EventAttributes[] = [];
        if (!data[i] || !data[i].schedules) {
            continue;
        }

        const schedule = data[i].schedules;
        if (!schedule) {
            console.error("No schedule found for calendar " + data[i].id);
            continue;
        }

        const term = schedule.term.toString();
        const calInfo = CALENDAR_INFO[term];
        const courses = schedule.course_schedule_associations.map(
            (csa: { courses: any; confirms: any }) => {
                return {
                    title: csa.courses.title,
                    code: csa.courses.code,
                    instructors: csa.courses.instructors
                        ? "Instructors: " + csa.courses.instructors.join(", ")
                        : "",
                    sections: csa.courses.sections.filter(
                        (section: { title: string }) => {
                            return Object.values(csa.confirms).includes(
                                section.title
                            );
                        }
                    )
                };
            }
        );

        // Loop through each course
        for (let j = 0; j < courses.length; j++) {
            const course = courses[j];

            // Loop through each section
            for (let k = 0; k < course.sections.length; k++) {
                const section = course.sections[k];
                const dur = section.end_time - section.start_time;
                const description =
                    course.instructors !== ""
                        ? course.title + "\n" + course.instructors
                        : course.title;

                const newEvent: EventAttributes = {
                    title: `${course.code.split("/")[0]} - ${section.title}`,
                    start: [
                        ...calculateStart(
                            calInfo.start,
                            calInfo.start_day,
                            section.days
                        ),
                        Math.trunc(section.start_time / 6) + 8,
                        (section.start_time % 6) * 10
                    ] as DateArray,
                    duration: {
                        hours: Math.trunc(dur / 6),
                        minutes: (dur % 6) * 10
                    },
                    recurrenceRule: valueToRRule(section.days, calInfo.end),
                    busyStatus: "BUSY",
                    transp: "OPAQUE",
                    productId: "tigerjunction/ics",
                    calName: "ReCal+ " + calInfo.name,
                    startOutputType: "local",
                    endOutputType: "local",
                    startInputType: "local",
                    endInputType: "local",
                    location: section.room ? section.room : "",
                    description: description
                };
                if (!newEvent.start.includes(NaN)) {
                    events.push(newEvent);
                }
            }
        }

        if (events.length === 0) {
            upsertPromises.push(
                supabase.storage
                    .from("calendars")
                    .update(data[i].id + ".ics", "", {
                        cacheControl: "900",
                        upsert: true,
                        contentType: "text/calendar"
                    })
            );
            continue;
        }

        createEvents(events, async (error, value) => {
            if (error) {
                console.error(error);
                return new Response(JSON.stringify(error), { status: 500 });
            }

            // Append time zone info to start time
            value = value.replace(/DTSTART/g, "DTSTART;TZID=America/New_York");

            // Push to supabase storage
            upsertPromises.push(
                supabase.storage
                    .from("calendars")
                    .update(data[i].id + ".ics", value, {
                        cacheControl: "900",
                        upsert: true,
                        contentType: "text/calendar"
                    })
            );
        });
    }
    console.log(
        "Generated " +
            upsertPromises.length +
            " calendars in " +
            (Date.now() - startTime) / 1000 +
            "s"
    );

    const CONCURRENT_REQUESTS = 10;
    for (let i = 0; i < upsertPromises.length; i += CONCURRENT_REQUESTS) {
        await Promise.all(upsertPromises.slice(i, i + CONCURRENT_REQUESTS));
    }

    console.log(
        "Processed " +
            data.length +
            " calendars in " +
            (Date.now() - startTime) / 1000 +
            "s"
    );
}
