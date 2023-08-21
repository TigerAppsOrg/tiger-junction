<script lang="ts">
import Modal from "$lib/components/elements/Modal.svelte";
    import { modalStore } from "$lib/stores/modal";

export let showModal: boolean = false;
</script>

<Modal {showModal}>
    <div>
        Hello World
        <button on:click={() => console.log(modalStore.getQueue())}>
            fe
        </button>
    </div>
</Modal>