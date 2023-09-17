<script lang="ts">
import type { SupabaseClient } from "@supabase/supabase-js";
import { savedCourses } from "$lib/stores/rpool";
import { get } from "svelte/store";
import { currentSchedule, currentTerm, hoveredCourse, ready } from "$lib/stores/recal";
import { sectionData, type SectionData } from "$lib/stores/rsections";
import type { CalBoxParam, CourseData } from "$lib/types/dbTypes";
import { rMeta } from "$lib/stores/rmeta";
import CalBox from "./elements/save/CalBox.svelte";
import { valueToDays } from "$lib/scripts/convert";

export let supabase: SupabaseClient;

let toRender: CalBoxParam[] = [];

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
    for (let i = 0; i < saved.length; i++) {
        let course = saved[i];
        let courseSections = sections[course.id];
        let courseMeta = meta[course.id];

        for (let j = 0; j < courseSections.length; j++) {
            let section = courseSections[j];
            let days = valueToDays(section.days);

            for (let k = 0; k < days.length; k++) {
                let day = days[k];
                courseRenders.push({
                    courseCode: course.code,
                    section: section,
                    color: courseMeta.color,
                    confirmed: false,
                    day: day,
                    slot: 0,
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
                    courseCode: hovered.code,
                    section: section,
                    color: -1,
                    confirmed: false,
                    day: day,
                    slot: 0,
                });
            }
        }
    }

    // Sort by start time
    courseRenders.sort((a, b) => 
        a.section.start_time - b.section.start_time);

    // Find overlaps and assign slotIndex


    // Determine styles for each CalBoxParam


    // Render CalBoxParam
    toRender = courseRenders;
}

// Find overlaps and assign slotIndex
const findOverlaps = (calboxes: CalBoxParam[]) => {

}

// Determine styles for each CalBoxParam
const determineStyles = (calboxes: CalBoxParam[]) => {

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
            
            <div class="grid grid-cols-5 w-full h-[96%] relative">

            <!-- * Grid Lines -->
            {#each {length: 75} as _}
                <div class="outline outline-[1px] outline-slate-600/30
                dark:outline-slate-200/30"></div>
            {/each}

            <!-- * CalBoxes-->
            <!-- Saved Courses With Meta Colors -->
            <!-- {#key toRender}
            {#each toRender as params}
                <CalBox {params} />
            {/each}
            {/key} -->
        </div>
        
    </div>
</div>

<style lang="postcsss">

</style>