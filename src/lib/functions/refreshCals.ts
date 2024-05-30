// Cron job to refresh calendars every day
import { createClient } from '@supabase/supabase-js';
import { createEvents, type DateArray, type EventAttributes } from 'ics';
import { calculateStart, valueToRRule } from '$lib/scripts/ReCal+/ical';
import { CALENDAR_INFO } from '$lib/changeme.js';
import { config } from 'dotenv';

export async function handler() {
    config();
    // Environment variables are loaded into AWS Lambda manually
    const supabase = createClient(process.env.PUBLIC_SUPABASE_URL as string, 
        process.env.SERVICE_KEY as string, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
    
    const { data, error } = await supabase.from("icals")
        .select(`
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
        `)
        .not("schedule_id", "is", null);
    
    if (error) {
        console.log(error);
        return new Response(JSON.stringify(error), { status: 500 });
    }
    
    console.log("Found " + data.length + " calendars");
    let count = 0;
    
    // Loop through each schedule
    for (let i = 0; i < data.length; i++) {
        const events: EventAttributes[] = [];
        const term = data[i].schedules.term;
        const calInfo = CALENDAR_INFO[term];
        const courses = data[i].schedules.course_schedule_associations
            .map((csa: { courses: any, confirms: any }) => {
                return {
                    title: csa.courses.title,
                    code: csa.courses.code,
                    instructors: csa.courses.instructors ? 
                        "Instructors: " +  csa.courses.instructors.join(", ") 
                        : "",
                    sections: csa.courses.sections
                    .filter((section: { title: string; }) => {
                        return Object.values(csa.confirms)
                            .includes(section.title)
                    })
                }
            });
        
        // Loop through each course
        for (let j = 0; j < courses.length; j++) {
            const course = courses[j];
    
            // Loop through each section
            for (let k = 0; k < course.sections.length; k++) {
                const section = course.sections[k];
                const dur = section.end_time - section.start_time
                const description = course.instructors !== "" ? 
                    course.title + "\n" + course.instructors 
                    : course.title;
    
                const newEvent: EventAttributes = {
                    title: `${course.code.split("/")[0]} - ${section.title}`,
                    start: [...calculateStart(calInfo.start, calInfo.start_day, section.days), 
                        Math.trunc(section.start_time / 6) + 8, 
                        section.start_time % 6 * 10] as DateArray,
                    duration: { hours: Math.trunc(dur / 6), minutes: dur % 6 * 10 },
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
                    description: description,
                };
                events.push(newEvent);
            }
        }
    
        createEvents(events, async (error, value) => {
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
                    contentType: "text/calendar",
                });
            count++;
        });
    }
    
    const returnString = "Successfully refreshed " + count + " calendars";
    console.log(returnString);
}