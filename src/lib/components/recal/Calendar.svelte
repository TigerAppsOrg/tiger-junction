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

let prevSchedule: number = -1;
let prevTerm: number = -1;

$: triggerRender($savedCourses[$currentSchedule], $hoveredCourse, $ready, $recal, $currentSchedule, $currentTerm);

const triggerRender = (a: any, b: any, c: any, d: any,
currentSchedule: number, currentTerm: number) => {
    if (prevSchedule === -1) prevSchedule = currentSchedule;
    if (prevTerm === -1) prevTerm = currentTerm;

    if (prevSchedule !== currentSchedule || prevTerm !== currentTerm) {
        prevSchedule = currentSchedule;
        prevTerm = currentTerm;
        toRender = [];
    }

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
    const sortedCalboxes = calboxes.slice().sort((a, b) => a.section.start_time - b.section.start_time);
    
    // First pass: Assign maxSlot values
    for (let i = 0; i < sortedCalboxes.length; i++) {
        const calbox = sortedCalboxes[i];
        let maxSlot = 1;
        const group = [calbox];

        for (let j = 0; j < i; j++) {
            const prevCalbox = sortedCalboxes[j];

            // Check for overlap based on start and end times and the same day
            if (
                calbox.section.start_time < prevCalbox.section.end_time &&
                calbox.section.end_time > prevCalbox.section.start_time &&
                calbox.day === prevCalbox.day
            ) {
                group.push(prevCalbox);
                maxSlot = prevCalbox.maxSlot + 1;
            }
        }

        // Update maxSlot for the entire group
        group.forEach((groupCalbox) => {
            groupCalbox.maxSlot = maxSlot;
        });
    }

    // Second pass: Assign slotIndex values
    for (let i = 0; i < sortedCalboxes.length; i++) {
        const calbox = sortedCalboxes[i];
        const group = [];

        for (let j = 0; j < i; j++) {
            const prevCalbox = sortedCalboxes[j];

            // Check for overlap based on start and end times and the same day
            if (
                calbox.section.start_time < prevCalbox.section.end_time &&
                calbox.section.end_time > prevCalbox.section.start_time &&
                calbox.day === prevCalbox.day
            ) {
                group.push(prevCalbox);
            }
        }

        // Assign slotIndex for the current calbox within its group
        calbox.slot = group.length;
    }
};

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

<!--!------------------------------------------------------------------>

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