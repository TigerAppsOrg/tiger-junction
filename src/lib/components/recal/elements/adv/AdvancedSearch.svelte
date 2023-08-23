<script lang="ts">
import Checkpill from "$lib/components/elements/Checkpill.svelte";
import Modal from "$lib/components/elements/Modal.svelte";
import { modalStore } from "$lib/stores/modal";
import { searchSettings } from "$lib/stores/recal";

export let showModal: boolean = false;

// Save settings and close modal
const saveSettings = () => {
    modalStore.close();
}
</script>

<Modal {showModal}>
    <div class="p-6 w-[80vw] max-w-2xl">
        <h1 class="text-xl font-bold mb-2">Advanced Search Settings</h1>
        <div class="flex flex-col gap-2">
            <div class="settings-area" id="options">
                <h2 class="text-lg font-bold mb-2">Search By</h2>
                <div class="flex flex-wrap gap-2">
                    {#each Object.keys($searchSettings.options) as option}
                        <Checkpill name={option} />
                    {/each}
                </div>
            </div>
            <div class="settings-area" id="filters">

            </div>
            <div class="settings-area" id="time">

            </div>
        </div> <!-- * End Container -->
        <div class="flex gap-2 border-t-2 mt-2 pt-2">
            <!-- <button class="btn border-2 border-slate-600/30 flex-1" 
            on:click={() => modalStore.close()}>
                Cancel
            </button> -->
            <button class="btn flex-1 bg-gradient-to-r 
            from-blue-500 to-purple-500 text-white"
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