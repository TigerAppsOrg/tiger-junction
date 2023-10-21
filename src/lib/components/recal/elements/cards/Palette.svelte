<script lang="ts">
import { rgbToHSL } from "$lib/scripts/convert";
import { calColors, type CalColors } from "$lib/stores/styles";

// 8 Colors in rgb format
export let colors: CalColors = {
    "-1": "#000000",
    "0": "#ff0000",
    "1": "#ff8000",
    "2": "#ffff00",
    "3": "#00ff00",
    "4": "#0000ff",
    "5": "#4b0082",
    "6": "#800080",
}

export let title: string = "Palette";

/**
 * Save colors to store
 */
const handleClick = () => {
    let hslColors: CalColors = Object.entries(colors)
        .map(([key, value]) => [key, rgbToHSL(value)])
        .reduce((acc, [key, value]) => ({...acc, [key]: value}), {}) as CalColors;

    calColors.set(hslColors);
}
</script>

<!-- Display 7 main colors on top in columns, and then the preview color underneath -->
<button class="border" on:click={handleClick}>
    <div class="flex flex-col">
        <div class="flex flex-col">
            {#each Object.values(colors) as color}
                <div class="w-36 h-4" style="background-color: {color}"></div>
            {/each}
        </div>
        <div class="font-normal p-1">
            {title}
        </div>
    </div>
</button>

<style lang="postcss">
.border {
    @apply border-2 rounded-md overflow-clip
    border-slate-600/30 dark:border-slate-200/30;
}

.border:hover {
    @apply border-slate-600/50 dark:border-slate-200/50
    transform  duration-150;
}
</style>