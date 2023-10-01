<script lang="ts">
import Modal from "$lib/components/elements/Modal.svelte";
import { modalStore } from "$lib/stores/modal";

export let showModal: boolean = false;
</script>


<Modal {showModal}>
    <div class="p-6 w-[80vw] max-w-4xl">
        <h1 class="text-xl font-bold mb-2">Utilities</h1>
        
        <div>

        </div> <!-- * End Container -->
        
        <div class="flex gap-2 border-t-2 mt-2 pt-2">

            <button class="btn flex-1 bg-gradient-to-r 
            from-deepblue-light to-deepblue-dark text-white"
            type="submit"
            on:click={() => modalStore.close()}>
                Close
            </button>
        </div> <!-- * End Nav -->
    </div>
</Modal>

<style lang="postcss">
.btn {
    @apply rounded-md py-2 text-center;
}
</style>