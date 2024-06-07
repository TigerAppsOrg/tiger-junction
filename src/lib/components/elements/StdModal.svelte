<script lang="ts">
    import Modal from "$lib/components/elements/Modal.svelte";
    import { modalStore } from "$lib/stores/modal";
    import StdButton from "./StdButton.svelte";

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

        {#if stdClose}
            <div
                class="flex gap-2 border-t-2 mt-2 pt-2
            border-zinc-200 dark:border-zinc-600">
                <StdButton message="Close" onClick={() => modalStore.close()} />
            </div>
        {:else}
            <slot name="buttons" />
        {/if}
    </div>
</Modal>
