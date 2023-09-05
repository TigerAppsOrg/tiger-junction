<script lang="ts">
import type { SupabaseClient } from "@supabase/supabase-js";
import { savedCourses } from "$lib/stores/rpool";
import { get } from "svelte/store";
import { currentSchedule, ready } from "$lib/stores/recal";
import { sectionData, type SectionData } from "$lib/stores/rsections";
import type { CourseData } from "$lib/types/dbTypes";
import { rMeta } from "$lib/stores/rmeta";
import CalBox from "./elements/save/CalBox.svelte";
    import { valueToDays } from "$lib/scripts/convert";

export let supabase: SupabaseClient;

type CalBoxParam = {
    courseCode: string;
    section: SectionData;
    borderColor: string;
    bgColor: string;
    confirmed: boolean;
    preview?: boolean;
    day: number;
}

$: saved = calcFormSaved($ready, $currentSchedule, get(savedCourses));


// Conversion from code to tailwind color
const COLOR_MAP: Record<number, string> = {
    0: "blue-500",
    1: "green-500",
    2: "yellow-500",
    3: "red-500",
    4: "purple-500",
    5: "pink-500",
    6: "indigo-500",
} as const;

const calcFormSaved = (ready: boolean, currentSchedule: number, 
savedCourses: Record<number, CourseData[]>): CalBoxParam[] => {
    let saved: CalBoxParam[] = [];
    if (!ready) return saved;

    const current = savedCourses[currentSchedule];
    for (let i = 0; i < current.length; i++) {
        const course = current[i];
        const sections = get(sectionData)[course.term][course.id];

        const meta = get(rMeta)[currentSchedule][course.id];
        const color = COLOR_MAP[meta.color % 7];
    
        for (let j = 0; j < sections.length; j++) {
            let catConf = meta.confirms.hasOwnProperty(sections[j].category);
            let days: number[] = valueToDays(sections[j].days);

            if (!catConf) 
                for (let k = 0; k < days.length; k++) 
                    saved.push({
                        courseCode: course.code,
                        section: sections[j],
                        borderColor: color,
                        bgColor: color,
                        confirmed: false,
                        preview: false,
                        day: k,
                    });
            else if (meta.confirms[sections[j].category] === j) 
                for (let k = 0; k < days.length; k++)
                    saved.push({
                        courseCode: course.code,
                        section: sections[j],
                        borderColor: color,
                        bgColor: color,
                        confirmed: true,
                        preview: false,
                        day: k,
                    });
        }
    }

    console.log(saved);
    return saved;
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
            {#key saved}
            {#each saved as save}
                <CalBox courseCode={save.courseCode} section={save.section}
                borderColor={save.borderColor} bgColor={save.bgColor}
                confirmed={save.confirmed} preview={save.preview}
                day={save.day} />
            {/each}
            {/key}

        <!-- Hovered Course -->
        </div>
        
    </div>
</div>

<style lang="postcsss">

</style>