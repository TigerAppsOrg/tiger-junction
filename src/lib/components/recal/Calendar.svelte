<script lang="ts">
import type { SupabaseClient } from "@supabase/supabase-js";
import { savedCourses } from "$lib/stores/rpool";
import { get } from "svelte/store";
import { currentSchedule, ready } from "$lib/stores/recal";
import { sectionData, type SectionData } from "$lib/stores/rsections";
import type { CalBoxParam, CourseData } from "$lib/types/dbTypes";
import { rMeta } from "$lib/stores/rmeta";
import CalBox from "./elements/save/CalBox.svelte";
import { valueToDays } from "$lib/scripts/convert";

export let supabase: SupabaseClient;

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
    
}

// $: saved = calcFormSaved($ready, $currentSchedule, get(savedCourses));

// const calcFormSaved = (ready: boolean, currentSchedule: number, 
// savedCourses: Record<number, CourseData[]>): CalBoxParam[] => {
//     let saved: CalBoxParam[] = [];
//     if (!ready) return saved;

//     const current = savedCourses[currentSchedule];
//     for (let i = 0; i < current.length; i++) {
//         const course = current[i];
//         const sections = get(sectionData)[course.term][course.id];

//         const meta = get(rMeta)[currentSchedule][course.id];
    
//         for (let j = 0; j < sections.length; j++) {
//             let catConf = meta.confirms.hasOwnProperty(sections[j].category);
//             let days: number[] = valueToDays(sections[j].days);

//             if (!catConf) 
//                 for (let k = 0; k < days.length; k++) 
//                     saved.push({
//                         courseCode: course.code,
//                         section: sections[j],
//                         color: meta.color,
//                         confirmed: false,
//                         preview: false,
//                         day: k,
//                     });
//             else if (meta.confirms[sections[j].category] === j) 
//                 for (let k = 0; k < days.length; k++)
//                     saved.push({
//                         courseCode: course.code,
//                         section: sections[j],
//                         color: meta.color,
//                         confirmed: true,
//                         preview: false,
//                         day: k,
//                     });
//         }
//     }

//     console.log(saved);
//     return saved;
// }

// const findOverlaps = () => {
//     // Sort by start time
//     $toRender.sort((a, b) => a.start - b.start);
    
//     // Find overlaps
//     for (let i = 0; i < $toRender.length; i++) {
//         let current = $toRender[i];
//         let overlaps = 0;
//         for (let j = 0; j < $toRender.length; j++) {
//             if (i === j) continue;
//             let compare = $toRender[j];
//             if (current.day !== compare.day) continue;
//             if (current.start >= compare.end) continue;
//             if (current.end <= compare.start) continue;
//             overlaps++;
//         }
//         current.totalSlots = overlaps + 1;
//     }

//     // Assign slots
//     for (let i = 0; i < $toRender.length; i++) {
//         let current = $toRender[i];
//         let slot = 1;
//         for (let j = 0; j < $toRender.length; j++) {
//             if (i === j) continue;
//             let compare = $toRender[j];
//             if (current.day !== compare.day) continue;
//             if (current.start >= compare.end) continue;
//             if (current.end <= compare.start) continue;
//             if (current.slotIndex !== compare.slotIndex) continue;
//             compare.slotIndex = current.totalSlots + 1;
//             slot++;
//         }
//         current.slotIndex = slot;
//     }
// }

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
            <!-- {#key saved}
            {#each saved as params}
                <CalBox {params} />
            {/each}
            {/key} -->

        <!-- Hovered Course -->
        </div>
        
    </div>
</div>

<style lang="postcsss">

</style>