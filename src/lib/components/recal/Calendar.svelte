<script lang="ts">
    import { savedCourses } from "$lib/stores/rpool";
    import { get } from "svelte/store";
    import {
        currentSchedule,
        hoveredCourse,
        ready,
        recal,
        searchSettings
    } from "$lib/stores/recal";
    import { currentTerm } from "$lib/changeme";
    import { sectionData } from "$lib/stores/rsections";
    import type { CalBoxParam } from "$lib/types/dbTypes";
    import { rMeta } from "$lib/stores/rmeta";
    import CalBox from "./elements/save/CalBox.svelte";
    import { valueToDays } from "$lib/scripts/convert";
    import { calColors, type CalColors } from "$lib/stores/styles";
    import { slide } from "svelte/transition";
    import { linear } from "svelte/easing";

    let toRender: CalBoxParam[] = [];

    let prevSchedule: number = -1;
    let prevTerm: number = -1;

    const MARKERS = [
        "8AM",
        "9AM",
        "10AM",
        "11AM",
        "12PM",
        "1PM",
        "2PM",
        "3PM",
        "4PM",
        "5PM",
        "6PM",
        "7PM",
        "8PM",
        "9PM",
        "10PM"
    ];

    $: triggerRender(
        $currentSchedule,
        $currentTerm,
        $savedCourses[$currentSchedule],
        $hoveredCourse,
        $ready,
        $recal,
        $calColors
    );

    /**
     * Trigger render if schedule or term or args change
     * @param currentSchedule
     * @param currentTerm
     * @param args
     */
    const triggerRender = (
        currentSchedule: number,
        currentTerm: number,
        ...args: any[]
    ) => {
        if (prevSchedule === -1) prevSchedule = currentSchedule;
        if (prevTerm === -1) prevTerm = currentTerm;

        if (prevSchedule !== currentSchedule || prevTerm !== currentTerm) {
            prevSchedule = currentSchedule;
            prevTerm = currentTerm;
            toRender = [];
        }

        if (!get(ready)) return;
        renderCalBoxes();
    };

    /*
    Procedure for rendering:
    1. Get saved courses from savedCourses
    2. Get hovered course from hoveredCourse (if exists)
    3. Get section data from sectionData
    4. Get meta data from rMeta
    5. For each course, get the sections
    6. For each section, get the days
    7. For each day, create a CalBoxParam with an empty slotIndex
    8. Sort by start time
    9. For each CalBoxParam, find overlaps
    10. For each CalBoxParam, assign slotIndex
    11. Determine styles for each CalBoxParam
    12. Render CalBoxParam
*/
    const renderCalBoxes = () => {
        let courseRenders: CalBoxParam[] = [];

        // Steps 1-4
        let saved = $savedCourses[$currentSchedule];
        let hovered = $hoveredCourse;
        let sections = $sectionData[$currentTerm];
        let meta = $rMeta[$currentSchedule];

        // Steps 5-7
        if (!saved) return;
        for (let i = 0; i < saved.length; i++) {
            let course = saved[i];
            let courseSections = sections[course.id];
            let courseMeta = meta[course.id];

            if (!courseSections || !courseMeta) continue;

            for (let j = 0; j < courseSections.length; j++) {
                let section = courseSections[j];
                let days = valueToDays(section.days);

                let confirmed = false;
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
                        else confirmed = true;
                    } else {
                        if (
                            courseMeta.confirms[section.category] !==
                            section.title
                        )
                            continue;
                        else confirmed = true;
                    }
                }

                for (let k = 0; k < days.length; k++) {
                    let day = days[k];
                    courseRenders.push({
                        courseCode: course.code.split("/")[0],
                        section: section,
                        color: courseMeta.color.toString() as keyof CalColors,
                        confirmed: confirmed,
                        day: day,
                        slot: 0,
                        maxSlot: 0,
                        colSpan: 1,
                        top: "",
                        left: "",
                        width: "",
                        height: ""
                    });
                }
            }
        }

        if (hovered) {
            let hoveredSections = sections[hovered.id];
            for (let i = 0; i < hoveredSections.length; i++) {
                let section = hoveredSections[i];
                let days = valueToDays(section.days);

                for (let j = 0; j < days.length; j++) {
                    let day = days[j];
                    courseRenders.push({
                        courseCode: hovered.code.split("/")[0],
                        section: section,
                        color: "-1",
                        confirmed: false,
                        day: day,
                        slot: 0,
                        maxSlot: 0,
                        colSpan: 1,
                        top: "",
                        left: "",
                        width: "",
                        height: ""
                    });
                }
            }
        }

        // Steps 8-12
        // Sort by start time
        courseRenders.sort(
            (a, b) => a.section.start_time - b.section.start_time
        );

        findOverlaps(courseRenders);
        calculateDimensions(courseRenders);

        toRender = courseRenders;
    };

    // Credits to Gabe Sidler on StackOverflow for the algorithm
    // Find overlaps and assign width and left
    const findOverlaps = (calboxes: CalBoxParam[]) => {
        let sortedCalboxes = calboxes.slice();

        // Split into days
        let days: CalBoxParam[][] = [[], [], [], [], []];
        for (let i = 0; i < sortedCalboxes.length; i++) {
            let calbox = sortedCalboxes[i];
            days[calbox.day - 1].push(calbox);
        }

        // Sort within days
        for (let i = 0; i < days.length; i++) {
            days[i].sort((a, b) => a.section.end_time - b.section.end_time);
            days[i].sort(
                (b, a) =>
                    a.section.end_time -
                    a.section.start_time -
                    (b.section.end_time - b.section.start_time)
            );
            days[i].sort((a, b) => a.section.start_time - b.section.start_time);
        }

        for (let i = 0; i < days.length; i++) {
            let columns: CalBoxParam[][] = [];
            let lastEventEnding: number | null = null;

            days[i].forEach(box => {
                if (
                    lastEventEnding !== null &&
                    box.section.start_time >= lastEventEnding
                ) {
                    packEvents(columns);
                    columns = [];
                    lastEventEnding = null;
                }

                let placed = false;
                for (let i = 0; i < columns.length; i++) {
                    let col = columns[i];
                    if (!conflicts(box, col[col.length - 1])) {
                        col.push(box);
                        placed = true;
                        break;
                    }
                }

                if (!placed) {
                    columns.push([box]);
                }

                if (
                    lastEventEnding === null ||
                    box.section.end_time > lastEventEnding
                ) {
                    lastEventEnding = box.section.end_time;
                }
            });

            if (columns.length > 0) packEvents(columns);
        }
    };

    // Check for conflicts
    const conflicts = (a: CalBoxParam, b: CalBoxParam) => {
        return (
            a.section.start_time < b.section.end_time &&
            a.section.end_time > b.section.start_time &&
            a.day === b.day
        );
    };

    // Set the left and right positions for each calbox in the connected group
    const packEvents = (cols: CalBoxParam[][]) => {
        for (let i = 0; i < cols.length; i++) {
            for (let j = 0; j < cols[i].length; j++) {
                let cur = cols[i][j];
                let colSpan = expandEvent(cur, i, cols);
                cur.left = `${(cur.day - 1) * 20 + (i / cols.length) * 20}%`;
                cur.width = `${(20 * colSpan) / cols.length - 0.4}%`;
            }
        }
    };

    // Expand the event to the right
    const expandEvent = (
        calbox: CalBoxParam,
        iColumn: number,
        cols: CalBoxParam[][]
    ) => {
        let colSpan = 1;
        for (let i = iColumn + 1; i < cols.length; i++) {
            for (let j = 0; j < cols[i].length; j++) {
                if (conflicts(calbox, cols[i][j])) {
                    return colSpan;
                }
            }
            colSpan++;
        }
        return colSpan;
    };

    // Calculate dimensions for each CalBoxParam
    const calculateDimensions = (calboxes: CalBoxParam[]) => {
        for (let i = 0; i < calboxes.length; i++) {
            let calbox = calboxes[i];
            let height =
                ((calbox.section.end_time - calbox.section.start_time) / 90) *
                100;
            let top = (calbox.section.start_time / 90) * 100;

            calbox.height = `${height}%`;
            calbox.top = `${top}%`;
        }
    };
</script>

<!--!------------------------------------------------------------------>

<div class="h-full">
    <div class="h-full w-full std-area flex rounded-md">
        {#if $searchSettings.style["Show Time Marks"]}
            <div
                class="w-10 h-full"
                transition:slide={{ axis: "x", duration: 150, easing: linear }}>
                <div
                    class="h-[4%] outline outline-[0.5px] outline-zinc-200
            dark:outline-zinc-700 overflow-hidden">
                </div>
                <div class="h-[96%] grid grid-cols-1">
                    {#each MARKERS as marker}
                        <div
                            class="text-xs font-light
                outline outline-[0.5px] outline-zinc-200
                dark:outline-zinc-700 pt-[1px] pl-[1px]
                overflow-hidden">
                            {marker}
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        <div class="w-full h-full">
            <div
                class="grid grid-cols-5 w-full h-[4%] text-center
            font-semibold overflow-x-clip">
                {#each ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as day}
                    <div
                        class="outline outline-[0.5px] outline-zinc-200
                    dark:outline-zinc-700 flex justify-center
                    items-center text-sm">
                        {day}
                    </div>
                {/each}
            </div>

            <div class="w-full h-[96%] flex">
                <!-- Grid -->
                <div
                    class="flex-1 grid grid-cols-5 h-full relative
                overflow-x-clip">
                    <!-- * Grid Lines -->
                    {#each { length: 75 } as _}
                        <div
                            class="outline outline-[0.5px] outline-zinc-200
                        dark:outline-zinc-700">
                        </div>
                    {/each}

                    <!-- * CalBoxes-->
                    {#key toRender}
                        {#each toRender as params}
                            <CalBox {params} />
                        {/each}
                    {/key}
                </div>
            </div>
        </div>
    </div>
</div>

<style lang="postcsss">
</style>
