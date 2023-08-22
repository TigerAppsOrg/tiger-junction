<script lang="ts">
import Modal from "$lib/components/elements/Modal.svelte";
import { modalStore } from "$lib/stores/modal";

export let showModal: boolean = false;
</script>

<Modal {showModal}>
    <div>
        <h1 class="text-xl font-bold">Advanced Search Settings</h1>
        <div class="flex">
            <div class="settings-area" id="options">

            </div>
            <div class="settings-area" id="filters">

            </div>
            <div class="settings-area" id="time">

            </div>
        </div> <!-- * End Container -->
        <div>
            <button class="btn btn-primary" on:click={() => modalStore.close()}>Close</button>
        </div> <!-- * End Nav -->
    </div>
</Modal>

<style lang="postcss">
.settings-area {
    @apply bg-red-500;
}
</style>