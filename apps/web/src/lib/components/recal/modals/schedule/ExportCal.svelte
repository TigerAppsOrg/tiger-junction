<script lang="ts">
    import { CALENDAR_INFO, currentTerm } from "$lib/changeme";
    import StdButton from "$lib/components/ui/StdButton.svelte";
    import StdModal from "$lib/components/ui/StdModal.svelte";
    import { calculateStart, valueToRRule } from "$lib/scripts/ReCal+/ical";
    import { currentSchedule, scheduleCourseMeta } from "$lib/stores/recal";
    import { savedCourses } from "$lib/stores/rpool";
    import { sectionData } from "$lib/stores/rsections";
    import { toastStore } from "$lib/stores/toast";
    import type { SupabaseClient } from "@supabase/supabase-js";
    import { createEvents, type DateArray, type EventAttributes } from "ics";
    import { getContext } from "svelte";

    export let showModal: boolean = false;
    const supabase = getContext("supabase") as SupabaseClient;

    const SUPABASE_BUCKET_URL =
        "https://capvnrguyrvudlllydxa.supabase.co/storage/v1/object/public/calendars/";

    let link: string = "";

    let isLoading = false;

    /**
     * Create an ical file and upload it to supabase storage.
     */
    const createIcal = async () => {
        if (isLoading) return;
        isLoading = true;

        // Create event for each course
        let events: EventAttributes[] = [];

        let saved = $savedCourses[$currentSchedule];
        let sections = $sectionData[$currentTerm];
        let meta = $scheduleCourseMeta[$currentSchedule];

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
                    if (
                        typeof courseMeta.confirms[section.category] ===
                        "number"
                    ) {
                        if (
                            parseInt(courseMeta.confirms[section.category]) !==
                            section.id
                        )
                            continue;
                    } else {
                        if (
                            courseMeta.confirms[section.category] !==
                            section.title
                        )
                            continue;
                    }
                } else continue outer;

                const calInfo = CALENDAR_INFO[$currentTerm];
                const dur = section.end_time - section.start_time;
                const description =
                    course.instructors && course.instructors.length > 0
                        ? course.title +
                          "\nInstructors: " +
                          course.instructors.join(", ")
                        : course.title;

                let newEvent: EventAttributes = {
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

                if (section.room) newEvent.location = section.room;

                if (!newEvent.start.includes(NaN)) {
                    events.push(newEvent);
                }
            }
        }

        if (events.length === 0) {
            toastStore.add("warning", "No confirmed courses to export!");
            return;
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

            // Append time zone info to start time
            value = value.replace(/DTSTART/g, "DTSTART;TZID=America/New_York");

            // Push to supabase storage
            const { data, error: supabaseError } = await supabase.storage
                .from("calendars")
                .upload(title, value, {
                    cacheControl: "900",
                    upsert: true,
                    contentType: "text/calendar"
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
                        schedule_id: $currentSchedule
                    }
                ]);

            if (supabaseError4) {
                console.log(supabaseError4);
                return;
            }

            link = data.path;
        });

        isLoading = false;
    };
</script>

<StdModal title="Export Schedule" stdClose={true} {showModal}>
    <div class="flex flex-col space-y-2 md:space-y-4" slot="main">
        {#if isLoading}
            <div>
                <p>Loading calendar export... This may take a few seconds.</p>
            </div>
        {:else}
            {#if !link}
                <p>
                    This will create a new iCal file with all your confirmed
                    courses, which you can add to your calendar app by
                    downloading the resultant file or copying the link. If you
                    use the link, your calendar will automatically update
                    approximately every 24 hours. To update your export
                    immediately, simply export again.
                    <span class="underline">
                        Warning: creating a new export will overwrite any
                        existing exports. Custom events will not be exported.
                    </span>
                </p>
            {:else}
                <p>
                    Your calendar export is ready! You can download the file or
                    copy the link below.
                </p>
            {/if}

            {#if link}
                <div
                    class="flex flex-col md:flex-row items-center justify-between gap-2">
                    <p
                        class="text-black dark:text-zinc-100 btn flex-1 text-center break-all text-sm">
                        {SUPABASE_BUCKET_URL}{link}
                    </p>

                    <div class="flex flex-col sm:flex-row gap-2">
                        <StdButton
                            message="Copy Link"
                            scheme="2"
                            onClick={() => {
                                navigator.clipboard.writeText(
                                    `${SUPABASE_BUCKET_URL}${link}`
                                );
                                toastStore.add(
                                    "success",
                                    "Copied link to clipboard!"
                                );
                            }} />

                        <StdButton
                            message="Download File"
                            scheme="1"
                            onClick={() => {
                                let a = document.createElement("a");
                                a.href = `${SUPABASE_BUCKET_URL}${link}`;
                                a.download = "ReCal+.ics";
                                a.click();
                            }} />
                    </div>
                </div>
            {:else}
                <StdButton
                    message="Create New Export"
                    scheme="2"
                    onClick={createIcal} />
            {/if}
        {/if}
    </div>
</StdModal>

<style lang="postcss">
    .btn {
        @apply duration-150 px-4 py-2 rounded-md;
    }
</style>
