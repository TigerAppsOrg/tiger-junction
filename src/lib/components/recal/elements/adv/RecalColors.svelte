<script lang="ts">
import Modal from "$lib/components/elements/Modal.svelte";
import { calColors, type CalColors } from "$lib/stores/styles";
import { rgbToHSL, hslToRGB } from "$lib/scripts/convert";
import { modalStore } from "$lib/stores/modal";
import { DEFAULT_RCARD_COLORS } from "$lib/stores/styles";
import paletteIcon from "$lib/img/icons/paletteicon.svg";
import { onMount } from "svelte";

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

<Modal {showModal}>
    <div class="p-6 w-[80vw] max-w-4xl">
        <h1 class="text-xl font-bold mb-2">Color Settings</h1>
        <div class="flex flex-col gap-2">

            <!-- Card Colors -->
            <div class="settings-area" id="options">
                <h2 class="text-lg font-bold mb-2">Card Colors</h2>
                <div class="flex flex-wrap gap-2 justify-center">
                    {#each Object.keys($calColors) as color}
                        <div class="flex flex-col items-center">
                            <input type="color" 
                            class="dark:bg-slate-800/50 bg-slate-200/50"
                            bind:value={rgbColors[color]}/>
                            <div class="text-xs">{
                                color === "-1" ? 
                                    "Preview" : 
                                    `Color ${parseInt(color) + 1}`
                            }</div>
                        </div>
                    {/each}
                </div>

                
                <button class="btn flex items-center bg-gradient-to-r 
                from-deepblue-light to-deepblue-dark text-white
                mx-auto gap-2 p-4 mt-6"
                on:click={saveColors}>
                    <img src={paletteIcon} alt="palette Icon" 
                    class="invert h-8 w--8">
                    <span>
                        View Color Palettes
                    </span>
                </button>

            </div>
        </div>
        <div class="flex gap-2 border-t-2 mt-2 pt-2">
            <button class="btn border-2 border-slate-600/30 flex-1" 
            on:click={() => modalStore.close()}>
                Cancel
            </button>
            <button class="btn bg-orange-400 text-white flex-1" 
            on:click={resetColors}>
                Reset to Default
            </button>
            <button class="btn flex-1 bg-gradient-to-r 
            from-deepblue-light to-deepblue-dark text-white"
            on:click={saveColors}>
                Save
            </button>
        </div> <!-- * End Nav -->
    </div>
</Modal>

<style lang="postcss">
.settings-area {
    @apply p-4 border-t-2
    border-slate-600/30 dark:border-slate-200/30;
}

.btn {
    @apply rounded-md py-2 text-center;
}
</style>