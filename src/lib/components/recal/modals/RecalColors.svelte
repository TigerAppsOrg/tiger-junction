<script lang="ts">
import { calColors, type CalColors } from "$lib/stores/styles";
import { rgbToHSL, hslToRGB } from "$lib/scripts/convert";
import { modalStore } from "$lib/stores/modal";
import { DEFAULT_RCARD_COLORS } from "$lib/stores/styles";
import { onMount } from "svelte";
import StdModal from "$lib/components/elements/StdModal.svelte";
import StdButton from "$lib/components/elements/StdButton.svelte";

export let showModal: boolean = false;

// Convert hslColors to rgb
let rgbColors: Record<string, string> = {};

/**
 * Save colors to store and close modal
 */
const saveColors = () => {
    // Convert rgbColors to hsl
    let hslColors: CalColors = Object.entries(rgbColors)
        .map(([key, value]) => [key, rgbToHSL(value)])
        .reduce((acc, [key, value]) => ({...acc, [key]: value}), {}) as CalColors;

    calColors.set(hslColors);
    modalStore.close();
}

/**
 * Reset colors to default
 */
const resetColors = () => {
    rgbColors = Object.entries(DEFAULT_RCARD_COLORS)
        .map(([key, value]) => [key, hslToRGB(value)])
        .reduce((acc, [key, value]) => ({...acc, [key]: value}), {});
}

onMount(() => {
    rgbColors = Object.entries($calColors)
        .map(([key, value]) => [key, hslToRGB(value)])
        .reduce((acc, [key, value]) => ({...acc, [key]: value}), {});
})
</script>

<StdModal title="Color Settings" {showModal} stdClose={false}>
    <div class="flex flex-col gap-2" slot="main">

        <!-- Card Colors -->
        <div class="settings-area" id="options">
            <h2 class="text-lg font-bold mb-2">Card Colors</h2>
            <div class="flex flex-wrap gap-2 justify-center">
                {#each Object.keys($calColors) as color}
                    <div class="flex flex-col items-center">
                        <input type="color" 
                        class="dark:bg-slate-800/50 bg-slate-200/50
                        w-14 h-8 2 cursor-pointer"
                        bind:value={rgbColors[color]}/>
                        <div class="text-sm font-light">{
                            color === "-1" ? 
                                "Preview" : 
                                `Color ${parseInt(color) + 1}`
                        }</div>
                    </div>
                {/each}
            </div>
        </div>

        <StdButton message="View Color Palettes" 
        onClick={() => modalStore.open("rpalettes", {
            current: true,
            front: true,
            force: true,
        })} scheme="2" />
    </div>

    <div class="flex gap-2 border-t-2 mt-2 pt-2" slot="buttons">
        <StdButton message="Cancel" onClick={() => modalStore.close()}
        scheme="-1"/>

        <StdButton message="Reset to Default" onClick={resetColors}
        scheme="1"/>

        <StdButton message="Save" onClick={saveColors} />
    </div> 
</StdModal>



<style lang="postcss">
.settings-area {
    @apply p-4 border-t-2
    border-slate-600/30 dark:border-slate-200/30;
}
</style>