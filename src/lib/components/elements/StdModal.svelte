<script lang="ts">
import Modal from "$lib/components/elements/Modal.svelte";
import { modalStore } from "$lib/stores/modal";

export let title: string = "Modal";
export let stdClose: boolean = true;
export let showModal: boolean = false;
</script>

<Modal {showModal}>
    <div class="p-6 w-[80vw] max-w-4xl">
        <h1 class="text-xl font-bold mb-2">{title}</h1>
        
        <div>
            <slot name="main" />
        </div> 
        
        <div class="flex gap-2 border-t-2 mt-2 pt-2">

            <slot name="buttons" />
            {#if stdClose}
            <button class="rounded-md py-2 text-center
            flex-1 bg-gradient-to-r btn
            from-deepblue-light to-deepblue-dark text-white"
            type="submit"
            on:click={() => modalStore.close()}>
                Close
            </button>
            {/if}
        </div> 
    </div>
</Modal>