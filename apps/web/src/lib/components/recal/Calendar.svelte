<script lang="ts">
    import { browser } from "$app/environment";
    import { currentTerm } from "$lib/changeme";
    import {
        hoveredCourse,
        hoveredEvent,
        type BoxParam
    } from "$lib/scripts/ReCal+/calendar";
    import { valueToDays } from "$lib/scripts/convert";
    import { scheduleEventMap } from "$lib/stores/events";
    import {
        currentSchedule,
        ready,
        recal,
        scheduleCourseMeta,
        searchSettings
    } from "$lib/stores/recal";
    import { savedCourses } from "$lib/stores/rpool";
    import { sectionData } from "$lib/stores/rsections";
    import { calColors, isMobile, type CalColors } from "$lib/stores/styles";
    import { linear } from "svelte/easing";
    import { get } from "svelte/store";
    import { slide } from "svelte/transition";
    import CalBox from "./calendar/CalBox.svelte";

    const TIME_MARKS_KEY = "showTimeMarks";

    // Load preference from localStorage on init
    if (browser) {
        const saved = localStorage.getItem(TIME_MARKS_KEY);
        if (saved !== null) {
            $searchSettings.style["Show Time Marks"] = saved === "true";
        }
    }

    // Save preference to localStorage when it changes
    $effect(() => {
        if (browser) {
            localStorage.setItem(
                TIME_MARKS_KEY,
                String($searchSettings.style["Show Time Marks"])
            );
        }
    });

    let toRender: BoxParam[] = $state([]);

    let prevSchedule: number = $state(-1);
    let prevTerm: number = $state(-1);

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

    $effect(() => {
        triggerRender(
            $currentSchedule,
            $currentTerm,
            $savedCourses[$currentSchedule],
            $hoveredCourse,
            $hoveredEvent,
            $ready,
            $recal,
            $calColors,
            $scheduleEventMap[$currentSchedule]
        );
    });

    /**
     * Trigger render if schedule or term or args change
     * @param currentSchedule
     * @param currentTerm
     * @param args
     */
    const triggerRender = (
        currentSchedule: number,
        currentTerm: number,
        ...args: unknown[]
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

    const renderCalBoxes = () => {
        // Course handling
        const itemsToRender: BoxParam[] = [];

        const DEFAULT_DIMENSIONS = {
            slot: 0,
            maxSlot: 0,
            colSpan: 1,
            top: "",
            left: "",
            width: "",
            height: ""
        };

        const saved = $savedCourses[$currentSchedule];
        const sections = $sectionData[$currentTerm];
        const meta = $scheduleCourseMeta[$currentSchedule];

        if (!saved) return;
        for (let i = 0; i < saved.length; i++) {
            const course = saved[i];
            const courseSections = sections[course.id];
            const courseMeta = meta[course.id];

            if (!courseSections || !courseMeta) continue;

            for (let j = 0; j < courseSections.length; j++) {
                const section = courseSections[j];
                const days = valueToDays(section.days);

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
                    const day = days[k];
                    itemsToRender.push({
                        type: "course",
                        courseCode: course.code.split("/")[0],
                        section: section,
                        color: courseMeta.color.toString() as keyof CalColors,
                        confirmed: confirmed,
                        day: day,
                        ...DEFAULT_DIMENSIONS
                    });
                }
            }
        }

        if ($hoveredCourse) {
            const hoveredSections = sections[$hoveredCourse.id];
            for (let i = 0; i < hoveredSections.length; i++) {
                const section = hoveredSections[i];
                const days = valueToDays(section.days);

                for (let j = 0; j < days.length; j++) {
                    const day = days[j];
                    itemsToRender.push({
                        type: "course",
                        courseCode: $hoveredCourse.code.split("/")[0],
                        section: section,
                        color: "-1",
                        confirmed: false,
                        day: day,
                        ...DEFAULT_DIMENSIONS
                    });
                }
            }
        }

        // Event handling
        const events = scheduleEventMap.getSchedule($currentSchedule);

        for (const event of events) {
            for (const time of event.times) {
                const days = valueToDays(time.days);
                for (let i = 0; i < days.length; i++) {
                    const day = days[i];
                    itemsToRender.push({
                        type: "event",
                        color: "E",
                        day: day,
                        id: event.id,
                        section: {
                            title: event.title,
                            start_time: time.start,
                            end_time: time.end
                        },
                        ...DEFAULT_DIMENSIONS
                    });
                }
            }
        }

        if ($hoveredEvent && !events.includes($hoveredEvent)) {
            for (const time of $hoveredEvent.times) {
                const days = valueToDays(time.days);
                for (let i = 0; i < days.length; i++) {
                    const day = days[i];
                    itemsToRender.push({
                        type: "event",
                        color: "-1",
                        day: day,
                        id: $hoveredEvent.id,
                        section: {
                            title: $hoveredEvent.title,
                            start_time: time.start,
                            end_time: time.end
                        },
                        ...DEFAULT_DIMENSIONS
                    });
                }
            }
        }

        // Sort by start time
        itemsToRender.sort(
            (a, b) => a.section.start_time - b.section.start_time
        );

        findOverlaps(itemsToRender);
        calculateDimensions(itemsToRender);

        toRender = itemsToRender;
    };

    // Credits to Gabe Sidler on StackOverflow for the algorithm
    // Find overlaps and assign width and left
    const findOverlaps = (calboxes: BoxParam[]) => {
        const sortedCalboxes = calboxes.slice();

        // Split into days
        const days: BoxParam[][] = [[], [], [], [], []];
        for (let i = 0; i < sortedCalboxes.length; i++) {
            const calbox = sortedCalboxes[i];
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
            let columns: BoxParam[][] = [];
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
                    const col = columns[i];
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
    const conflicts = (a: BoxParam, b: BoxParam) => {
        return (
            a.section.start_time < b.section.end_time &&
            a.section.end_time > b.section.start_time &&
            a.day === b.day
        );
    };

    // Set the left and right positions for each calbox in the connected group
    const packEvents = (cols: BoxParam[][]) => {
        for (let i = 0; i < cols.length; i++) {
            for (let j = 0; j < cols[i].length; j++) {
                const cur = cols[i][j];
                const colSpan = expandEvent(cur, i, cols);
                cur.left = `${(cur.day - 1) * 20 + (i / cols.length) * 20}%`;
                cur.width = `${(20 * colSpan) / cols.length - 0.4}%`;
            }
        }
    };

    // Expand the event to the right
    const expandEvent = (
        calbox: BoxParam,
        iColumn: number,
        cols: BoxParam[][]
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

    // Calculate dimensions for each BoxParam
    const calculateDimensions = (calboxes: BoxParam[]) => {
        for (let i = 0; i < calboxes.length; i++) {
            const calbox = calboxes[i];
            const height =
                ((calbox.section.end_time - calbox.section.start_time) / 90) *
                100;
            const top = (calbox.section.start_time / 90) * 100;

            calbox.height = `${height}%`;
            calbox.top = `${top}%`;
        }
    };
</script>

<!--!------------------------------------------------------------------>

<div class="h-full">
    <div class="h-full w-full std-area flex rounded-md relative">
        {#if !$isMobile}
            <!-- Time marks toggle button (absolutely positioned) -->
            <button
                class="absolute top-0 left-0 z-10 h-[4%] w-7 flex items-center justify-center
                 dark:text-zinc-100 hover:text-zinc-600 hover:dark:text-zinc-300 hover:duration-150"
                onclick={() =>
                    ($searchSettings.style["Show Time Marks"] =
                        !$searchSettings.style["Show Time Marks"])}
                title="Toggle time marks">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    class="w-4 h-4">
                    <path
                        d="M2 4.5A.5.5 0 012.5 4h6a.5.5 0 010 1h-6a.5.5 0 01-.5-.5zm0 5A.5.5 0 012.5 9h4a.5.5 0 010 1h-4a.5.5 0 01-.5-.5zm0 5a.5.5 0 01.5-.5h6a.5.5 0 010 1h-6a.5.5 0 01-.5-.5z" />
                </svg>
            </button>

            <!-- Time marks column (only when enabled) -->
            {#if $searchSettings.style["Show Time Marks"]}
                <div
                    class="h-full flex flex-col shrink-0 w-8"
                    transition:slide={{
                        axis: "x",
                        duration: 75,
                        easing: linear
                    }}>
                    <div
                        class="h-[4%] outline outline-[0.5px] outline-zinc-200 dark:outline-zinc-700">
                    </div>
                    <div class="flex-1 grid grid-cols-1">
                        {#each MARKERS as marker}
                            <div
                                class="text-[10px] font-light
                            outline outline-[0.5px] outline-zinc-200
                            dark:outline-zinc-700 pt-[1px] pl-[2px]
                            overflow-hidden text-zinc-500 dark:text-zinc-400">
                                {marker}
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
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
                    {#each { length: 75 } as _}
                        <div
                            class="outline outline-[0.5px] outline-zinc-200
                        dark:outline-zinc-700">
                        </div>
                    {/each}

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
