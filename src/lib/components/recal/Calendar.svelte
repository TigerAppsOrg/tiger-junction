<script lang="ts">
import type { SupabaseClient } from "@supabase/supabase-js";
import { savedCourses } from "$lib/stores/rpool";
import { get } from "svelte/store";
import { currentSchedule, currentTerm, hoveredCourse, ready, recal } from "$lib/stores/recal";
import { sectionData } from "$lib/stores/rsections";
import type { CalBoxParam } from "$lib/types/dbTypes";
import { rMeta } from "$lib/stores/rmeta";
import CalBox from "./elements/save/CalBox.svelte";
import { valueToDays } from "$lib/scripts/convert";

export let supabase: SupabaseClient;

let toRender: CalBoxParam[] = [];

$: triggerRender($savedCourses[$currentSchedule], $hoveredCourse, $ready, $recal);

const triggerRender = (a: any, b: any, c: any, d: any) => {
    if (!get(ready)) return;
    renderCalBoxes();
}

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
    let courseRenders: CalBoxParam[]= [];

    console.log($rMeta);
    // Steps 1-4
    let saved = $savedCourses[$currentSchedule];
    let hovered = $hoveredCourse;
    let sections = $sectionData[$currentTerm];
    let meta = $rMeta[$currentSchedule];

    // Steps 5-7
    for (let i = 0; i < saved.length; i++) {
        let course = saved[i];
        let courseSections = sections[course.id];
        let courseMeta = meta[course.id];

        for (let j = 0; j < courseSections.length; j++) {
            let section = courseSections[j];
            let days = valueToDays(section.days);


            let confirmed = false;
            if (courseMeta.confirms.hasOwnProperty(section.category)) 
                if (courseMeta.confirms[section.category] !== section.id)
                    continue;
                else confirmed = true;

            for (let k = 0; k < days.length; k++) {
                let day = days[k];
                courseRenders.push({
                    courseCode: course.code.split("/")[0],
                    section: section,
                    color: courseMeta.color,
                    confirmed: confirmed,
                    day: day,
                    slot: 0,
                    maxSlot: 0,
                    top: "",
                    left: "",
                    width: "",
                    height: "",
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
                    color: -1,
                    confirmed: false,
                    day: day,
                    slot: 0,
                    maxSlot: 0,
                    top: "",
                    left: "",
                    width: "",
                    height: "",
                });
            }
        }
    }

    // Steps 8-12
    // Sort by start time
    courseRenders.sort((a, b) => 
        a.section.start_time - b.section.start_time);

    findOverlaps(courseRenders);
    calculateDimensions(courseRenders);

    toRender = courseRenders;
}

// Find overlaps and assign slotIndex and maxSlot
// maxSlot is the number of overlaps for a given CalBoxParam
// slotIndex is the index of the CalBoxParam in the list of overlaps
const findOverlaps = (calboxes: CalBoxParam[]) => {
    let overlaps: Record<string, CalBoxParam[]> = {};

    // Assign slotIndex
    for (let i = 0; i < calboxes.length; i++) {
        let calbox = calboxes[i];
        let key = `${calbox.day}-${calbox.section.start_time}-${calbox.section.end_time}`;

        if (overlaps.hasOwnProperty(key)) {
            let overlap = overlaps[key];
            let found = false;

            for (let j = 0; j < overlap.length; j++) {
                let overlapCalbox = overlap[j];
                if (overlapCalbox.section.id === calbox.section.id) {
                    found = true;
                    break;
                }
            }

            if (!found) {
                overlap.push(calbox);
                calbox.slot = overlap.length - 1;
            }
        } else {
            overlaps[key] = [calbox];
            calbox.slot = 0;
        }
    }

    // Assign maxSlot
    for (let i = 0; i < calboxes.length; i++) {
        let calbox = calboxes[i];
        let key = `${calbox.day}-${calbox.section.start_time}-${calbox.section.end_time}`;
        calbox.maxSlot = overlaps[key].length;
    }
}

// Calculate dimensions for each CalBoxParam
const calculateDimensions = (calboxes: CalBoxParam[]) => {
    for (let i = 0; i < calboxes.length; i++) {
        let calbox = calboxes[i];
        let height = ((calbox.section.end_time - calbox.section.start_time) / 90) * 100;
        let top = ((calbox.section.start_time) / 90) * 100;
        let left = (calbox.day - 1) * 20 + (calbox.slot / calbox.maxSlot) * 20;
        let width = 20 / calbox.maxSlot - 0.4;


        calbox.height = `${height}%`;
        calbox.top = `${top}%`;
        calbox.left = `${left}%`;
        calbox.width = `${width}%`;
    }
}

</script>


<div class="h-full">
    <div class="h-full w-full std-area">
        <div class="grid grid-cols-5 w-full h-[4%] text-center 
        font-semibold">
            {#each ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as day}
                <div class="outline outline-[1px] outline-slate-600/30
                dark:outline-slate-200/30 flex justify-center 
                items-center text-sm">{day}</div>
            {/each}
        </div>
            
            <div class="grid grid-cols-5 w-full h-[96%] relative overflow-x-hidden">

            <!-- * Grid Lines -->
            {#each {length: 75} as _}
                <div class="outline outline-[1px] outline-slate-600/30
                dark:outline-slate-200/30"></div>
            {/each}

            <!-- * CalBoxes-->
            {#key toRender}
            {#each toRender as params}
                <CalBox {params} {supabase} />
            {/each}
            {/key}
        </div>
        
    </div>
</div>

<style lang="postcsss">

</style>