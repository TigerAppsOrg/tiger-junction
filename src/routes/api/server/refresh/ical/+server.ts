import { createClient } from "@supabase/supabase-js";
import { PUBLIC_SUPABASE_URL } from "$env/static/public";
import { SERVICE_KEY } from "$env/static/private";
import { createEvents, type DateArray, type EventAttributes } from "ics";
import { calculateStart, valueToRRule } from "$lib/scripts/ReCal+/ical";
import { CALENDAR_INFO } from "$lib/changeme.js";
import type { RequestEvent } from "./$types";
import { Database } from "$lib/types/supabaseTypes";

// Refresh all icals if they are associated with a schedule
export async function GET(req: RequestEvent) {
    // Deny access if not from cron
    if (
        req.request.headers.get("Authorization") !==
        `Bearer ${process.env.CRON_SECRET}`
    ) {
        return new Response("Unauthorized", { status: 401 });
    }

    const supabase = createClient<Database>(PUBLIC_SUPABASE_URL, SERVICE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

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
        console.log(error);
        return new Response(JSON.stringify(error), { status: 500 });
    }

    console.log("Found " + data.length + " calendars");

    // Loop through each schedule
    for (let i = 0; i < data.length; i++) {
        const events: EventAttributes[] = [];
        const term = data[i].schedules.term;
        const calInfo = CALENDAR_INFO[term];
        const courses = data[i].schedules.course_schedule_associations.map(
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
                events.push(newEvent);
            }
        }

        await createEvents(events, async (error, value) => {
            if (error) {
                console.log(error);
                return new Response(JSON.stringify(error), { status: 500 });
            }

            // Append time zone info to start time
            value = value.replace(/DTSTART/g, "DTSTART;TZID=America/New_York");

            // Push to supabase storage
            supabase.storage
                .from("calendars")
                .update(data[i].id + ".ics", value, {
                    cacheControl: "900",
                    upsert: true,
                    contentType: "text/calendar"
                });
        });
    }

    const returnString = "Successfully refreshed " + data.length + " calendars";
    console.log(returnString);
    return new Response(JSON.stringify(returnString), { status: 200 });
}
