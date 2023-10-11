<script lang="ts">
import Checkpill from "$lib/components/elements/Checkpill.svelte";
import Modal from "$lib/components/elements/Modal.svelte";
import TogTog from "$lib/components/elements/TogTog.svelte";
import { modalStore } from "$lib/stores/modal";
import { DEFAULT_SETTINGS, searchSettings } from "$lib/stores/recal";

export let showModal: boolean = false;

/**
 * Save settings and close modal
 */
const saveSettings = () => {
    modalStore.close();
}

let minInput: number = $searchSettings.filters["Rating"].min;
let maxInput: number = $searchSettings.filters["Rating"].max;

/**
 * Handle min rating input
 * @param e Input event
 */
const handleMin = (e: Event) => {
    let target = e.target as HTMLInputElement;
    minInput = parseFloat(target.value);
    if (minInput < 0) minInput = 0;
    if (minInput > 5) minInput = 5;
    $searchSettings.filters["Rating"].min = minInput;
}

/**
 * Handle max rating input
 * @param e Input event
 */
const handleMax = (e: Event) => {
    let target = e.target as HTMLInputElement;
    maxInput = parseFloat(target.value);
    if (maxInput < 0) maxInput = 0;
    if (maxInput > 5) maxInput = 5;
    $searchSettings.filters["Rating"].max = maxInput;
}
</script>

<Modal {showModal}>
    <div class="p-6 w-[80vw] max-w-4xl">
        <h1 class="text-xl font-bold mb-2">Advanced Search Settings</h1>
        <div class="flex flex-col gap-2">
            <!-- <div class="settings-area" id="options">
                <h2 class="text-lg font-bold mb-2">Search By</h2>
                <div class="flex flex-wrap gap-2">
                    {#each Object.keys($searchSettings.options) as option}
                        <Checkpill name={option} category="options" />
                    {/each}
                </div>
            </div> -->
            <div class="settings-area" id="filters">
                <h2 class="text-lg font-bold mb-2">Filters</h2>
                <div class="flex flex-wrap gap-2">
                    {#each Object.keys($searchSettings.filters) as filter}
                        <Checkpill name={filter} category="filters" />
                    {/each}
                </div>

                <!-- * Filter Specifications -->
                <div class="mt-4">
                    {#each Object.keys($searchSettings.filters) as filter}
                    {#if $searchSettings.filters[filter].enabled 
                    && $searchSettings.filters[filter].hasOwnProperty("values")}
                        <div class="border-slate-600/30 mx-8 p-2
                        dark:border-slate-200/30 border-t-2 mt-2">
                            <div>
                                <h3 class="text-lg font-semibold mb-2">{filter}</h3>
                            </div>
                            <div class="flex flex-wrap gap-2">
                                {#each Object.keys($searchSettings.filters[filter].values) 
                                as value}
                                    <Checkpill 
                                    name={value} 
                                    category={filter} />
                                {/each}
                            </div>
                        </div>
                    {/if}
                    {/each}

                    {#if $searchSettings.filters["Rating"].enabled}
                    <div class="border-slate-600/30 mx-8 p-2
                    dark:border-slate-200/30 border-t-2 mt-2">
                        <div class="mb-2 flex items-center gap-4">
                            <h3 class="text-lg font-semibold">Rating</h3>
                            <p class="italic">Note: courses with no rating correspond to 0</p>
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                            <input type="number" step="0.1" 
                            max="5" min="0" bind:value={minInput}
                            placeholder="Min Rating" 
                            class="p-2 h-10 std-area w-36"
                            on:input={handleMin}>
                            <span>to</span>
                            <input type="number" step="0.1" 
                            max="5" min="0" bind:value={maxInput}
                            placeholder="Max Rating" 
                            class="p-2 h-10 std-area w-36"
                            on:input={handleMax}>
                        </div>
                    </div>
                    {/if}

                </div>
            </div>
            <div class="settings-area" id="sort">
                <h2 class="text-lg font-bold mb-2">Sort By</h2>
                <div class="flex flex-wrap gap-2">
                    <!-- <TogTog name="Name" /> -->
                    <TogTog name="Rating" />
                    <TogTog name="Adjusted Rating" />
                </div>
            </div>
            <div class="settings-area" id="style">
                <h2 class="text-lg font-bold mb-2">Style</h2>
                <div class="flex flex-wrap gap-2">
                    {#each Object.keys($searchSettings.style) as style}
                        <Checkpill name={style} category="style" />
                    {/each}
                </div>
            </div>
        </div> <!-- * End Container -->
        <div class="flex gap-2 border-t-2 mt-2 pt-2">
            <button class="btn bg-black text-white dark:bg-slate-200
            dark:text-black hover:bg-black/80 flex-1" 
            on:click={() => $searchSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS))}>
                Reset to Default
            </button>
            <button class="btn flex-1 bg-gradient-to-r 
            from-deepblue-light to-deepblue-dark text-white"
            on:click={saveSettings}>
                Close
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