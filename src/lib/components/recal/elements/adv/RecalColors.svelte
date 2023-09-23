<script lang="ts">
import Modal from "$lib/components/elements/Modal.svelte";
import { calColors, type CalColors } from "$lib/stores/styles";
import { rgbToHSL, hslToRGB } from "$lib/scripts/convert";
import { modalStore } from "$lib/stores/modal";
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
                            <input type="color" bind:value={rgbColors[color]}/>
                            <div class="text-xs">{
                                color === "-1" ? "Preview" : `Color ${color}`
                            }</div>
                        </div>
                    {/each}
                </div>
            </div>

            <!-- Themes -->
            <!-- <div class="settings-area" id="options">
                <h2 class="text-lg font-bold mb-2">Themes</h2>
                <div class="flex flex-wrap gap-2 justify-center">
                    
                </div>
            </div> -->
        </div>
        <div class="flex gap-2 border-t-2 mt-2 pt-2">
            <button class="btn border-2 border-slate-600/30 flex-1" 
            on:click={() => modalStore.close()}>
                Cancel
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