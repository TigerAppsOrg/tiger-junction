import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SERVICE_KEY } from '$env/static/private';
import type { EventAttributes } from 'ics';

// Refresh all icals if they are associated with a schedule
export async function GET(req) {
    const supabase = createClient(PUBLIC_SUPABASE_URL, SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
    })

    const { data, error } = await supabase.from("icals")
        .select(`
            *,
            schedules ( id, course_schedule_associations ( courses (*, sections (*))))
        `)
        .not("schedule_id", "is", null);

    if (error) {
        console.log(error);
        return new Response(JSON.stringify(error), { status: 500 });
    }

    console.log(data);

    for (let i = 0; i < data.length; i++) {
        const courses = data[i].schedules.course_schedule_associations
            .map((csa: { courses: any; }) => csa.courses);
        console.log(courses);
    }
    
    // let newEvent: EventAttributes = {
    //     title: `${course.code.split("/")[0]} - ${section.title}`,
    //     start: [...calculateStart(calInfo.start, calInfo.start_day, section.days), 
    //         Math.trunc(section.start_time / 6) + 8, 
    //         section.start_time % 6 * 10] as DateArray,
    //     duration: { hours: Math.trunc(dur / 6), minutes: dur % 6 * 10 },
    //     recurrenceRule: valueToRRule(section.days, calInfo.end),
    //     // exclusionDates: calculateExclusions(calInfo.exclusions),
    //     busyStatus: "BUSY",
    //     transp: "OPAQUE",
    //     productId: "tigerjunction/ics",
    //     calName: "ReCal+ " + calInfo.name,
    //     startOutputType: "local",
    //     endOutputType: "local",
    //     startInputType: "local",
    //     endInputType: "local",
    //     location: section.room ? section.room : "",

    // };

    // console.log(newEvent);

    return new Response(JSON.stringify(data), { status: 200 });
}