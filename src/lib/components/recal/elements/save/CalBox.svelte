<script lang="ts">
import { darkenHSL, valuesToTimeLabel } from "$lib/scripts/convert";
import { currentSchedule, recal, searchSettings } from "$lib/stores/recal";
import type { CalBoxParam } from "$lib/types/dbTypes";
import type { SupabaseClient } from "@supabase/supabase-js";
import { calColors, type CalColors } from "$lib/stores/styles";
import { rMeta } from "$lib/stores/rmeta";

export let params: CalBoxParam;
export let supabase: SupabaseClient;
const { courseCode, section } = params;

let hovered: boolean = false;

let styles = {
    "bg": $calColors[params.color as keyof CalColors],
    "border": params.confirmed ? 
        darkenHSL($calColors[params.color as keyof CalColors], 40)
        : darkenHSL($calColors[params.color as keyof CalColors], 20),
    "text": darkenHSL($calColors[params.color as keyof CalColors], 40),
    "alpha": params.confirmed ? "1" : "0.7",
    "stripes": params.confirmed ? "" : `repeating-linear-gradient(
        45deg,
        transparent,
        transparent 5px,
        rgba(0, 0, 0, 0.05) 5px,
        rgba(0, 0, 0, 0.05) 10px);`,
    "top": `${params.top}`,
    "left": `${params.left}`,
    "height": `${params.height}`,
    "width": `${params.width}`,
}

$: cssVarStyles = Object.entries(styles)
		.map(([key, value]) => `--${key}:${value}`)
		.join(';');

// Toggle section choice and modify db and ui
const handleClick = () => {
    // Modify meta store
    let oldConfirms = {};
    rMeta.update(x => {
        oldConfirms = x[$currentSchedule][params.section.course_id].confirms;

        let a = x[$currentSchedule][params.section.course_id].confirms;

        if (a.hasOwnProperty(params.section.category)) {
            delete a[params.section.category];
        } else {
            a[params.section.category] = section.id;
        }
        return x;
    });

    let secMeta = $rMeta[$currentSchedule][params.section.course_id];

    // Check for completeness (addedkeys == requiredkeys)
    let addedKeys = Object.keys(secMeta.confirms);
    secMeta.complete = addedKeys.length === secMeta.sections.length;

    // Force calendar rerender
    $recal = !$recal;

    // Modify db
    supabase.from("course_schedule_associations")
        .update({
            metadata: $rMeta[$currentSchedule][params.section.course_id]
        })
        .eq("course_id", params.section.course_id)
        .eq("schedule_id", $currentSchedule)
    .then(res => {
        // Revert if error
        if (res.error) {
            console.log(res.error)
            rMeta.update(x => {
                x[$currentSchedule][params.section.course_id].confirms = oldConfirms;
                return x;
            });
            $recal = !$recal;
        }
    });
}

// For cursor-following tooltip
let mouseX: number = 0;
let mouseY: number = 0;
$: {
    if (hovered) {
        window.addEventListener("mousemove", (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });
    }
}

</script>

<!-- Height is on scale from 0 to 90 -->
<button id="box" class="absolute text-left flex p-1 rounded-md" style={cssVarStyles}
on:click={handleClick} 
on:mouseenter={() => hovered = true}
on:mouseleave={() => hovered = false}>
    <div class="text-xs z-40 -space-y-1 relative">
        <div class="font-light">
            {valuesToTimeLabel(section.start_time, section.end_time)}
        </div>
        <div class="font-normal">
            {courseCode} {section.title}
        </div>

        {#if $searchSettings.style["Always Show Enrollments"]}
            <div class="font-light">
                {section.tot}/{section.cap}
            </div>
        {/if}
    </div>
</button>

<!-- Tooltip with room and capacity that follows cursor -->
<!-- {#if $searchSettings.style["Show Tooltips"] && hovered} 
<div class="fixed z-50 bg-slate-100 dark:bg-slate-800 rounded-md 
p-1 text-xs opacity-80"
style={`top: ${mouseY}px; left: ${mouseX + 10}px;`}>
    <div class="font-light">
        {section.room ? section.room : ""}
    </div>
    <div class="font-light">
        Enrollments: {section.tot}/{section.cap}
    </div>
</div>
{/if} -->

<style lang="postcss">
button {
    background-image: var(--stripes);
    background-color: var(--bg);
    border-left: 4px solid var(--border);
    color: var(--text);
    opacity: var(--alpha);
    top: var(--top);
    left: var(--left);
    height: var(--height);
    width: var(--width);
}
</style>
