<script lang="ts">
    import {
        type BoxParam,
        courseHover,
        courseHoverRev,
        eventHover,
        eventHoverRev,
        isCourseBox
    } from "$lib/scripts/ReCal+/calendar";
    import { darkenHSL, valuesToTimeLabel } from "$lib/scripts/convert";
    import {
        currentSchedule,
        recal,
        scheduleCourseMeta,
        searchSettings
    } from "$lib/stores/recal";
    import { calColors } from "$lib/stores/styles";
    import type { SupabaseClient } from "@supabase/supabase-js";
    import { getContext } from "svelte";

    const supabase = getContext("supabase") as SupabaseClient;

    export let params: BoxParam;

    let courseCode: string;
    let border: string;
    let alpha: string;
    let stripes: string;

    if (isCourseBox(params)) {
        courseCode = params.courseCode;
        border = params.confirmed
            ? darkenHSL($calColors[params.color], 40)
            : darkenHSL($calColors[params.color], 20);
        alpha = params.confirmed ? "1" : "0.7";
        stripes = params.confirmed
            ? ""
            : `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 5px,
            rgba(0, 0, 0, 0.05) 5px,
            rgba(0, 0, 0, 0.05) 10px);`;
    } else {
        courseCode = "";
        border = darkenHSL($calColors[params.color], 40);
        alpha = "1";
        stripes = "";
    }

    let hovered: boolean = false;

    let styles = {
        bg: $calColors[params.color],
        border,
        text:
            parseInt($calColors[params.color].split(",")[2].split("%")[0]) > 50
                ? darkenHSL($calColors[params.color], 60)
                : darkenHSL($calColors[params.color], -60),
        alpha,
        stripes,
        top: `${params.top}`,
        left: `${params.left}`,
        height: `${params.height}`,
        width: `${params.width}`,
        hoverColor: "",
        hoverText: ""
    };

    if (parseInt(styles.bg.split(",")[2].split("%")[0]) > 50) {
        styles.hoverColor = darkenHSL(styles.bg, 10);
        styles.hoverText = darkenHSL(styles.text, 70);
    } else {
        styles.hoverColor = darkenHSL(styles.bg, -10);
        styles.hoverText = darkenHSL(styles.text, -70);
    }

    $: cssVarStyles = Object.entries(styles)
        .map(([key, value]) => `--${key}:${value}`)
        .join(";");

    // Toggle section choice and modify db and ui
    const handleClick = () => {
        if (!isCourseBox(params)) return;

        // Modify meta store
        let oldConfirms = {};
        scheduleCourseMeta.update(x => {
            oldConfirms =
                x[$currentSchedule][params.section.course_id].confirms;

            let a = x[$currentSchedule][params.section.course_id].confirms;

            if (a.hasOwnProperty(params.section.category)) {
                delete a[params.section.category];
            } else {
                a[params.section.category] = params.section.title;
            }
            return x;
        });

        let secMeta =
            $scheduleCourseMeta[$currentSchedule][params.section.course_id];

        // Check for completeness (addedkeys == requiredkeys)
        let addedKeys = Object.keys(secMeta.confirms);
        secMeta.complete = addedKeys.length === secMeta.sections.length;

        // Force calendar rerender
        $recal = !$recal;

        // Modify db
        supabase
            .from("course_schedule_associations")
            .update({
                metadata:
                    $scheduleCourseMeta[$currentSchedule][
                        params.section.course_id
                    ]
            })
            .eq("course_id", params.section.course_id)
            .eq("schedule_id", $currentSchedule)
            .then(res => {
                // Revert if error
                if (res.error) {
                    console.log(res.error);
                    scheduleCourseMeta.update(x => {
                        x[$currentSchedule][params.section.course_id].confirms =
                            oldConfirms;
                        return x;
                    });
                    $recal = !$recal;
                }
            });
    };

    $: isHovered = () => {
        if (hovered) return true;
        if (isCourseBox(params)) {
            return (
                $courseHover === params.section.course_id ||
                $courseHoverRev === params.section.course_id
            );
        } else {
            return $eventHover === params.id || $eventHoverRev === params.id;
        }
    };
</script>

<!-- Height is on scale from 0 to 90 -->
<button
    id="box"
    class="absolute text-left flex p-[1px] cursor-pointer rounded-sm duration-75"
    class:hovered={isHovered()}
    style={cssVarStyles}
    on:click={handleClick}
    on:mouseenter={() => {
        hovered = true;
        if (isCourseBox(params)) {
            $courseHoverRev = params.section.course_id;
        } else {
            $eventHoverRev = params.id;
        }
    }}
    on:mouseleave={() => {
        hovered = false;
        if (isCourseBox(params)) {
            $courseHoverRev = null;
        } else {
            $eventHoverRev = null;
        }
    }}>
    <div class="text-xs z-40 -space-y-1 relative overflow-x-hidden">
        <div class="font-light text-2xs leading-3 pb-[1px]">
            {valuesToTimeLabel(
                params.section.start_time,
                params.section.end_time
            )}
        </div>
        <div class="font-normal">
            {courseCode}
            {params.section.title}
        </div>

        {#if ($searchSettings.style["Always Show Rooms"] || hovered) && isCourseBox(params) && params.section.room}
            <div class="font-light text-2xs leading-3 pt-[1px]">
                {params.section.room}
            </div>
        {/if}

        {#if ($searchSettings.style["Always Show Enrollments"] || hovered) && isCourseBox(params)}
            <div class="font-light text-2xs leading-3 pt-[1px]">
                Enrollment: {params.section.tot}/{params.section.cap === 999
                    ? "∞"
                    : params.section.cap}
            </div>
        {/if}
    </div>
</button>

<style lang="postcss">
    button {
        background-image: var(--stripes);
        background-color: var(--bg);
        border-left: 3px solid var(--border);
        color: var(--text);
        opacity: var(--alpha);
        top: var(--top);
        left: var(--left);
        height: var(--height);
        width: var(--width);
    }

    .hovered {
        background-color: var(--hoverColor);
        color: var(--hoverText);
    }
</style>
