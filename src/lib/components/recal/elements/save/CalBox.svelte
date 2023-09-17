<script lang="ts">
import { darkenHSL, valuesToTimeLabel } from "$lib/scripts/convert";
import { searchSettings } from "$lib/stores/recal";
import type { CalBoxParam } from "$lib/types/dbTypes";
import type { SupabaseClient } from "@supabase/supabase-js";
import { calColors, type CalColors } from "$lib/stores/styles";

export let params: CalBoxParam;
export let supabase: SupabaseClient;
const { courseCode, section } = params;

let hovered: boolean = false;

params.confirmed = true;

let styles = {
    "bg": $calColors[params.color as keyof CalColors],
    "border": darkenHSL($calColors[params.color as keyof CalColors], 40),
    "alpha": params.confirmed ? "1" : "0.6",
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
    "trans": params.confirmed ? "solid" : "transparent"
}

$: cssVarStyles = Object.entries(styles)
		.map(([key, value]) => `--${key}:${value}`)
		.join(';');

// Toggle section choice and modify db and ui
const handleClick = () => {

}

</script>

<!-- Height is on scale from 0 to 90 -->
<button id="box" class="absolute text-left flex p-1" style={cssVarStyles}
on:click={handleClick} 
on:mouseenter={() => hovered = true}
on:mouseleave={() => hovered = false}>
    <div class="text-xs">
        <div class="font-light">
            {valuesToTimeLabel(section.start_time, section.end_time)}
        </div>
        <div class="font-normal">
            {courseCode} {section.title}
        </div>

        {#if $searchSettings.style["Always Show Enrollments"] || hovered === true}
            <div class="font-light">
                {section.tot}/{section.cap} Enrollments
            </div>
        {/if}

    </div>
</button>

<style lang="postcss">
button {
    background-image: var(--stripes);
    background-color: var(--bg);
    border-left: 4px var(--trans) var(--border);
    color: var(--border);
    opacity: var(--alpha);
    top: var(--top);
    left: var(--left);
    height: var(--height);
    width: var(--width);
}
</style>
