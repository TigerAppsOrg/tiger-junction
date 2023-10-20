<script lang="ts">
import StdModal from "$lib/components/elements/StdModal.svelte";
import { CALENDAR_INFO } from "$lib/constants";
import { valueToRRule } from "$lib/scripts/convert";
import { currentSchedule, currentTerm } from "$lib/stores/recal";
import { rMeta } from "$lib/stores/rmeta";
import { savedCourses } from "$lib/stores/rpool";
import { sectionData } from "$lib/stores/rsections";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createEvents, type DateArray, type EventAttributes } from "ics";
import { onMount } from "svelte";

export let showModal: boolean = false;
export let supabase: SupabaseClient;

const createIcal = async () => {
    // Create event for each course
    let events: EventAttributes[] = [];

    let saved = $savedCourses[$currentSchedule];
    let sections = $sectionData[$currentTerm];
    let meta = $rMeta[$currentSchedule];

    outer: for (let i = 0; i < saved.length; i++) {
        let course = saved[i];
        let courseSections = sections[course.id];
        let courseMeta = meta[course.id];

        if (!courseSections || !courseMeta) continue;

        for (let j = 0; j < courseSections.length; j++) {
            let section = courseSections[j];

            // Check if section is confirmed
            if (courseMeta.confirms.hasOwnProperty(section.category)) {
                // Legacy compatibility 
                if (typeof courseMeta.confirms[section.category] === "number") {
                    if (parseInt(courseMeta.confirms[section.category]) !== section.id)
                        continue;
                } else {
                    if (courseMeta.confirms[section.category] !== section.title)
                        continue;
                }
            } else continue outer;
            
            const calInfo = CALENDAR_INFO[$currentTerm];
            let dur = section.end_time - section.start_time;

            let newEvent: EventAttributes = {
                title: `${course.code} - ${section.title}`,
                start: [...calInfo.start, 
                    Math.trunc(section.start_time / 6) + 8, 
                    section.start_time % 6 * 10] as DateArray,
                duration: { hours: Math.trunc(dur / 6), minutes: dur % 6 * 10 },
                recurrenceRule: valueToRRule(section.days, calInfo.end),
                busyStatus: "BUSY",
                transp: "OPAQUE",
                productId: "tigerjunction/ics",
                calName: "ReCal+ " + calInfo.name,
            };

            if (section.room) newEvent.location = section.room;
            
            events.push(newEvent);
        }
    }

    createEvents(events, async (error, value) => {
        if (error) {
            console.log(error);
            return;
        }

        console.log(value);
        let title = crypto.randomUUID() + ".ics";

        // Push to supabase storage
        const { data, error: supabaseError } = await supabase.storage
            .from("calendars")
            .upload(title, value, {
                cacheControl: "900",
                upsert: true,
                contentType: "text/calendar",
            });
            
        if (supabaseError) {
            console.log(supabaseError);
            return;
        }

        console.log(data);
    });

}

onMount(async () => {
    await createIcal();
})
</script>

<StdModal title="Export Schedule" stdClose={true} {showModal}>

</StdModal>