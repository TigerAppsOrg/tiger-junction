<script lang="ts">
    import StdButton from "$lib/components/elements/StdButton.svelte";
import StdModal from "$lib/components/elements/StdModal.svelte";
import { CALENDAR_INFO } from "$lib/constants";
import { calculateStart, valueToRRule } from "$lib/scripts/ReCal+/ical";
import { currentSchedule, currentTerm } from "$lib/stores/recal";
import { rMeta } from "$lib/stores/rmeta";
import { savedCourses } from "$lib/stores/rpool";
import { sectionData } from "$lib/stores/rsections";
import { toastStore } from "$lib/stores/toast";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createEvents, type DateArray, type EventAttributes } from "ics";

export let showModal: boolean = false;
export let supabase: SupabaseClient;

let link: string = "";

/**
 * Create an ical file and upload it to supabase storage.
 */
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
                title: `${course.code.split("/")[0]} - ${section.title}`,
                start: [...calculateStart(calInfo.start, calInfo.start_day, section.days), 
                    Math.trunc(section.start_time / 6) + 8, 
                    section.start_time % 6 * 10] as DateArray,
                duration: { hours: Math.trunc(dur / 6), minutes: dur % 6 * 10 },
                recurrenceRule: valueToRRule(section.days, calInfo.end),
                // exclusionDates: calculateExclusions(calInfo.exclusions),
                busyStatus: "BUSY",
                transp: "OPAQUE",
                productId: "tigerjunction/ics",
                calName: "ReCal+ " + calInfo.name,
            };

            if (section.room) newEvent.location = section.room;
            
            events.push(newEvent);
        }
    }

    await createEvents(events, async (error, value) => {
        if (error) {
            console.log(error);
            return;
        }

        let title = crypto.randomUUID() + ".ics";

        // Check if user already has a calendar
        const userId = await supabase.auth.getUser();
        if (!userId || !userId.data || !userId.data.user) return;
        const { data: curCal, error: supabaseError2 } = await supabase
            .from("icals")
            .select("id")
            .eq("user_id", userId.data.user.id);

        if (supabaseError2) {
            console.log(supabaseError2);
            return;
        }

        // Delete old calendar (if exists)
        if (curCal && curCal.length > 0) {
            const { error: supabaseError3 } = await supabase
                .from("icals")
                .delete()
                .eq("id", curCal[0].id);

            if (supabaseError3) {
                console.log(supabaseError3);
                return;
            }
        }

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


        // Push to supabase database
        const { error: supabaseError4 } = await supabase
            .from("icals")
            .insert([
                {
                    id: data.path.split(".")[0],
                    user_id: userId.data.user.id,
                },
            ]);

        if (supabaseError4) {
            console.log(supabaseError4);
            return;
        }

        link = data.path;
    });
}
</script>

<StdModal title="Export Schedule" stdClose={true} {showModal}>
    <div class="flex flex-col space-y-2 md:space-y-4" slot="main">
        <p class="text-sm">
            This will create a new iCal file with all your confirmed courses, 
            which you can add to your calendar app of choice by 
            downloading the file or using the link.
            To update your calendar, simply export again.
            <span class="underline">
                Note: creating a new export will
                overwrite any existing 
                calendar exports.
            </span>
        </p>

        {#if link}
        <div class="flex flex-col md:flex-row items-center justify-between gap-2">
            <p class="bg-std-darkGray text-white btn flex-1 text-center break-all text-sm">
                https://tigerjunction.com/api/client/calendar/{link}
            </p>

            <div class="flex flex-col sm:flex-row gap-2">

                <StdButton message="Copy Link" scheme="2"
                onClick={() => {
                    navigator.clipboard.writeText(`https://tigerjunction.com/api/client/calendar/${link}`);
                    toastStore.add("success", "Copied link to clipboard!")
                }} />

                <StdButton message="Download File" scheme="1"
                onClick={() => {
                    let a = document.createElement("a");
                    a.href = `https://tigerjunction.com/api/client/calendar/${link}`;
                    a.download = "ReCal+.ics";
                    a.click();
                }} />
            </div>
        </div>
        {:else}
            <StdButton message="Export" scheme="2"
            onClick={createIcal} />
        {/if}
    </div>
</StdModal>

<style lang="postcss">
.btn {
    @apply duration-150 px-4 py-2 rounded-md;
}
</style>