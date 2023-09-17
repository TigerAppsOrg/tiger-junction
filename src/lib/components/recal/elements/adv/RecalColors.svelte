<script lang="ts">
import Modal from "$lib/components/elements/Modal.svelte";
import { calColors } from "$lib/stores/styles";
import { rgbToHSL, hslToRGB } from "$lib/scripts/convert";


$: rgbColors = Object.entries($calColors)
    .map(([key, value]) => [key, hslToRGB(value)])
    .reduce((acc, [key, value]) => ({...acc, [key]: value}), {});
$: console.log(rgbColors);

export let showModal: boolean = false;

</script>

<Modal {showModal}>
    <div class="p-6 w-[80vw] max-w-4xl">
        <h1 class="text-xl font-bold mb-2">Color Settings</h1>
        <div class="flex flex-col gap-2">
            <div class="settings-area" id="options">
                <!-- <h2 class="text-lg font-bold mb-2">Card Colors</h2> -->
                <div class="flex flex-wrap gap-2">
                    {#each Object.keys($calColors) as color}
                        <div class="flex flex-col items-center">
                            <input type="color" bind:value={rgbColors[color]} />
                            <!-- <div class="w-8 h-8 rounded-full" style={`background-color: ${$calColors[color]}`}></div>
                            <div class="text-xs">{color}</div> -->
                        </div>
                    {/each}
                </div>
            </div>
        </div>
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