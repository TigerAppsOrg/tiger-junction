// Cron job to refresh calendars every day
import { createClient } from "@supabase/supabase-js";
import { createEvents, type DateArray, type EventAttributes } from "ics";
import { calculateStart, valueToRRule } from "$lib/scripts/ReCal+/ical";
import { CALENDAR_INFO } from "$lib/changeme.js";
import { config } from "dotenv";
import type { Database } from "$lib/types/supabaseTypes";

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

    // Step 1: Fetch all ical records (lightweight query)
    const { data: icals, error: icalsError } = await supabase
        .from("icals")
        .select("id, schedule_id")
        .not("schedule_id", "is", null);

    if (icalsError) {
        console.error("Error fetching icals:", icalsError);
        return { statusCode: 500, body: JSON.stringify(icalsError) };
    }

    if (!icals || icals.length === 0) {
        console.log("No calendars found.");
        return { statusCode: 200, body: "No calendars to refresh." };
    }

    console.log(`Found ${icals.length} ical records in ${(Date.now() - startTime) / 1000}s`);

    // Step 2: Fetch schedules with course data in batches by schedule ID
    const scheduleIds = [...new Set(icals.map(i => i.schedule_id).filter(Boolean))] as number[];
    const scheduleMap = new Map<number, any>();
    const BATCH_SIZE = 30;

    for (let i = 0; i < scheduleIds.length; i += BATCH_SIZE) {
        const batch = scheduleIds.slice(i, i + BATCH_SIZE);
        const { data: schedules, error: schedError } = await supabase
            .from("schedules")
            .select(`
                id, term,
                course_schedule_associations ( metadata->confirms,
                    courses (code, title, instructors,
                        sections (
                            start_time, end_time, days, title, room
                        )
                    )
                )
            `)
            .in("id", batch);

        if (schedError) {
            console.error(`Error fetching schedules batch at ${i}:`, schedError);
            continue;
        }

        if (schedules) {
            for (const s of schedules) {
                scheduleMap.set(s.id, s);
            }
        }
    }

    console.log(
        `Fetched ${scheduleMap.size} schedules in ${(Date.now() - startTime) / 1000}s`
    );

    // Build combined data matching original shape
    const data = icals
        .map(ical => ({
            ...ical,
            schedules: scheduleMap.get(ical.schedule_id!) ?? null
        }))
        .filter(d => d.schedules !== null);

    // Step 3: Generate ICS content for each calendar (CPU-only, no I/O)
    startTime = Date.now();
    const uploads: { id: string; content: string }[] = [];
    let errorCount = 0;

    for (const cal of data) {
        if (!cal?.schedules) continue;

        const schedule = cal.schedules;
        const term = schedule.term.toString();
        const calInfo = CALENDAR_INFO[term];

        if (!calInfo) {
            console.warn(`No calendar info for term ${term}, skipping ${cal.id}`);
            continue;
        }

        const events: EventAttributes[] = [];
        const courses = schedule.course_schedule_associations.map(
            (csa: { courses: any; confirms: any }) => ({
                title: csa.courses.title,
                code: csa.courses.code,
                instructors: csa.courses.instructors
                    ? "Instructors: " + csa.courses.instructors.join(", ")
                    : "",
                sections: csa.courses.sections.filter(
                    (section: { title: string }) =>
                        Object.values(csa.confirms).includes(section.title)
                )
            })
        );

        for (const course of courses) {
            for (const section of course.sections) {
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
            uploads.push({ id: cal.id, content: "" });
            continue;
        }

        const { error: icsError, value } = createEvents(events);
        if (icsError || !value) {
            console.error(`Failed to create ics for calendar ${cal.id}:`, icsError);
            errorCount++;
            continue;
        }

        uploads.push({
            id: cal.id,
            content: value.replace(/DTSTART/g, "DTSTART;TZID=America/New_York")
        });
    }

    console.log(
        `Generated ${uploads.length} calendars in ${(Date.now() - startTime) / 1000}s`
    );

    // Step 4: Upload in controlled batches (deferred execution)
    const CONCURRENT_UPLOADS = 10;
    for (let i = 0; i < uploads.length; i += CONCURRENT_UPLOADS) {
        const batch = uploads.slice(i, i + CONCURRENT_UPLOADS);
        const results = await Promise.all(
            batch.map(({ id, content }) =>
                supabase.storage
                    .from("calendars")
                    .update(id + ".ics", content, {
                        cacheControl: "900",
                        upsert: true,
                        contentType: "text/calendar"
                    })
            )
        );

        for (let j = 0; j < results.length; j++) {
            if (results[j].error) {
                console.error(`Upload failed for ${batch[j].id}:`, results[j].error);
                errorCount++;
            }
        }
    }

    console.log(
        `Processed ${data.length} calendars (${errorCount} errors) in ${(Date.now() - startTime) / 1000}s`
    );

    return {
        statusCode: 200,
        body: `Refreshed ${data.length - errorCount}/${data.length} calendars`
    };
}
