<script lang="ts">
import { valuesToTimeLabel } from "$lib/scripts/convert";
import type { SectionData } from "$lib/stores/rsections";
import type { CalBoxParam } from "$lib/types/dbTypes";

export let params: CalBoxParam;
const { courseCode, section, confirmed, color, day } = params;

const COLOR_MAP: Record<number, string> = {
    "-1": "#a3a3a3",
    0: "#a3f923",
    1: "#f92323",
    2: "#f9d423",
    3: "#23f9f9",
    4: "#f923f9",
    5: "#23f923",
    6: "#f9f923",
}

// Slightly darker colors
const BORDER_MAP: Record<number, string> = {
    "-1": "#7a7a7a",
    0: "#7ab923",
    1: "#b92323",
    2: "#b9a923",
    3: "#23b9b9",
    4: "#b923b9",
    5: "#23b923",
    6: "#b9b923",
}

let styles = {
    "bg": COLOR_MAP[color],
    "border": BORDER_MAP[color],
    "alpha": confirmed ? "1" : "0.5",
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

// Toggle section choice and modify db and ui
const handleClick = () => {
    
}

</script>

{#if show}
<!-- Height is on scale from 0 to 90 -->
<button id="box" class="absolute rounded-md" style={cssVarStyles}
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
button {
    background-image: var(--stripes);
    background-color: var(--bg)/var(--alpha);
    border: 1px solid var(--border)/var(--alpha);
    text: var(--border)/var(--alpha);
}
</style>
