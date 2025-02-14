<script lang="ts">
    import { CURRENT_TERM_ID, schedules } from "$lib/changeme.js";
    import Calendar from "$lib/components/recal/Calendar.svelte";
    import Left from "$lib/components/recal/Left.svelte";
    import Top from "$lib/components/recal/Top.svelte";
    import {
        customEvents,
        scheduleEventMap,
        type UserCustomEvent
    } from "$lib/stores/events";
    import { isMobile, showCal } from "$lib/stores/styles";
    import {
        rawCourseData,
        ready,
        scheduleCourseMeta,
        searchCourseData
    } from "$lib/stores/recal.js";
    import { savedCourses } from "$lib/stores/rpool.js";
    import { sectionData, type SectionData } from "$lib/stores/rsections.js";
    import type { CourseData } from "$lib/types/dbTypes.js";
    import type { SupabaseClient } from "@supabase/supabase-js";
    import { onMount } from "svelte";

    export let data: {
        supabase: SupabaseClient;
        body: {
            courses: CourseData[];
            sections: SectionData[];
            schedules: any[];
            associations: any[];
            doneFeedback: boolean;
            events: UserCustomEvent[];
            eventAssociations: Record<number, number[]>;
        };
    };

    onMount(async () => {
        // if (!data.body.doneFeedback) {
        //     modalStore.push("feedbackpop");
        // }

        customEvents.set(data.body.events);
        scheduleEventMap.init(data.body.eventAssociations);

        if ($rawCourseData[CURRENT_TERM_ID].length === 0) {
            rawCourseData.update(x => {
                let cur: CourseData[] = (data.body.courses as CourseData[]).map(
                    y => {
                        let adj_evals = (y.num_evals + 1) * 1.5;
                        y.adj_rating =
                            y.rating !== null && y.num_evals !== null
                                ? Math.round(
                                      ((y.rating * adj_evals + 5) /
                                          (adj_evals + 2)) *
                                          100
                                  ) / 100
                                : 0;
                        return y;
                    }
                );
                x[CURRENT_TERM_ID] = cur;
                return x;
            });

            // Sort through sections and add to sectionData
            let sections = data.body.sections;
            let termSec = $sectionData[CURRENT_TERM_ID];
            for (let i = 0; i < sections.length; i++) {
                let sec = sections[i];
                let courseId = sec.course_id;

                // Add course to sectionData
                if (!termSec[courseId]) {
                    termSec[courseId] = [];
                }
                termSec[courseId].push(sec);
            }
        }
        searchCourseData.reset(CURRENT_TERM_ID);

        // Populate user schedules
        schedules.update(x => {
            x[CURRENT_TERM_ID] = data.body.schedules;
            return x;
        });

        // For each schedule, add to savedCourses
        savedCourses.update(x => {
            for (const schedule of data.body.schedules) {
                x[schedule.id] = [];
            }
            return x;
        });

        // Populate saved courses
        for (const scheduleIdS in data.body.associations) {
            const scheduleId = parseInt(scheduleIdS);
            if (
                $savedCourses[scheduleId] &&
                $savedCourses[scheduleId].length > 0
            )
                continue;

            const assocs = data.body.associations[scheduleId];

            for (const x of assocs) {
                const rawCourses = $rawCourseData[CURRENT_TERM_ID];
                let cur = rawCourses.find(
                    y => y.id === x.course_id
                ) as CourseData;

                // Add metadata
                scheduleCourseMeta.update(y => {
                    if (!y.hasOwnProperty(scheduleId)) y[scheduleId] = {};
                    y[scheduleId][cur.id] = x.metadata;
                    return y;
                });

                // Load section data
                await sectionData.add(data.supabase, CURRENT_TERM_ID, cur.id);

                // Update savedCourses
                savedCourses.update(z => {
                    if (!z[scheduleId]) z[scheduleId] = [];
                    z[scheduleId] = [...z[scheduleId], cur];
                    return z;
                });
            }
        }

        searchCourseData.resetAll();
        let id = $schedules[CURRENT_TERM_ID][0].id;
        let courses = $savedCourses[id] ? [...$savedCourses[id]] : [];
        searchCourseData.remove(CURRENT_TERM_ID, courses);

        $ready = true;
    });
</script>

<svelte:head>
    <title>TigerJunction | ReCal+</title>
</svelte:head>

<div
    class="flex flex-col flex-1 w-full max-w-[1500px] mx-auto
 dark:bg-zinc-900 max-h-screen overflow-clip">
    <div class="mx-2">
        <Top />
    </div>
    <!-- Fills bottom area does not cause page scroll -->
    <div
        id="main"
        class="flex flex-1 m-2 mt-0 max-h-[calc(100vh-140px)] overflow-hidden">
        {#if $isMobile}
            {#if !$showCal}
                <div class="flex-1 min-w-[200px]">
                    <Left />
                </div>
            {:else}
                <div class="flex-1">
                    <Calendar />
                </div>
            {/if}
        {:else}
            <div class="w-1/5 min-w-[200px]">
                <Left />
            </div>
            <div class="flex-1 min-w-[400px] ml-2">
                <Calendar />
            </div>
        {/if}
    </div>
</div>
