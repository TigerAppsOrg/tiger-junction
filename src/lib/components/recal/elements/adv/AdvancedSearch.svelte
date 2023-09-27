<script lang="ts">
import Checkpill from "$lib/components/elements/Checkpill.svelte";
import Modal from "$lib/components/elements/Modal.svelte";
import TogTog from "$lib/components/elements/TogTog.svelte";
import { modalStore } from "$lib/stores/modal";
import { searchSettings } from "$lib/stores/recal";

export let showModal: boolean = false;

// Save settings and close modal
const saveSettings = () => {
    modalStore.close();
}
</script>

<Modal {showModal}>
    <div class="p-6 w-[80vw] max-w-4xl">
        <h1 class="text-xl font-bold mb-2">Advanced Search Settings</h1>
        <div class="flex flex-col gap-2">
            <div class="settings-area" id="options">
                <h2 class="text-lg font-bold mb-2">Search By</h2>
                <div class="flex flex-wrap gap-2">
                    {#each Object.keys($searchSettings.options) as option}
                        <Checkpill name={option} category="options" />
                    {/each}
                </div>
            </div>
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
                </div>
            </div>
            <div class="settings-area" id="sort">
                <h2 class="text-lg font-bold mb-2">Sort By</h2>
                <div class="flex flex-wrap gap-2">
                    <!-- <TogTog name="Name" /> -->
                    <TogTog name="Rating" />
                    <!-- <TogTog name="Number" /> -->
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
            <!-- <button class="btn border-2 border-slate-600/30 flex-1" 
            on:click={() => modalStore.close()}>
                Cancel
            </button> -->
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