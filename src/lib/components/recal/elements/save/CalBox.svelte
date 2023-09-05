<script lang="ts">
import { valuesToTimeLabel } from "$lib/scripts/convert";
import type { SectionData } from "$lib/stores/rsections";
import type { CalBoxParam } from "$lib/types/dbTypes";

export let params: CalBoxParam;
const { courseCode, section, color, preview, day } = params;

const COLOR_MAP = {
    
}

let confirmed = true;


let styles = {
    "bg": `#a3f923`,
    "border": `#a3f923`,
    "stripes": confirmed ? "" : `repeating-linear-gradient(
        45deg,
        transparent,
        transparent 5px,
        rgba(0, 0, 0, 0.05) 5px,
        rgba(0, 0, 0, 0.05) 10px);`,
    
}

$: cssVarStyles = Object.entries(styles)
		.map(([key, value]) => `--${key}:${value}`)
		.join(';');

let show = false;

// Calculate height as percentage of calendar area
const calculateHeight = (): number => {
    if (section.start_time === -48 || section.end_time === -48) {
        show = false;
       return 0;
    }
    show = true;
    return ((section.end_time - section.start_time)/90) * 100;
}

// Determine color of card
// let colorStyle = preview ? 
//     "bg-slate-300 border-slate-600 text-slate-600 dark:bg-slate-500 dark:border-slate-200 dark:text-slate-200" :
//     confirmed ? 
//         `bg-${bgColor} border-${borderColor} text-${borderColor}` : 
//         `bg-${bgColor}/50 border-${bgColor}/60 text-${borderColor}/80`;

let height = calculateHeight();

// Toggle section choice and modify db and ui
const handleClick = () => {

}

</script>

{#if show}
<!-- Height is on scale from 0 to 90 -->
<button id="box" class="h-[{height}%] w-[18%] absolute
left-[{day*20}%] top-11 rounded-md" style={cssVarStyles}
on:click={handleClick}>
    <div class="text-sm">
        <div class="font-light">
            {valuesToTimeLabel(section.start_time, section.end_time)}
        </div>
        <div class="font-normal">
            {courseCode} {section.title}
        </div>
        <div class="font-thin">
            {section.tot}/{section.cap} Enrollments
        </div>
    </div>
</button>
{/if}

<style lang="postcss">
/* Stripes */
button {
    background-image: var(--stripes);

    background-color: var(--bg);
}
</style>
