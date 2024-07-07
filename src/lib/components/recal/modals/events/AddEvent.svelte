<script lang="ts">
    import StdButton from "$lib/components/elements/StdButton.svelte";
    import StdModal from "$lib/components/elements/StdModal.svelte";
    import { modalStore } from "$lib/stores/modal";

    export let showModal: boolean = false;

    // Save the event in the store and close the modal
    const saveEvent = () => {
        modalStore.pop();
    };
</script>

<StdModal title="Create New Event" stdClose={false} {showModal}>
    <main slot="main"></main>
    <div
        slot="buttons"
        class="flex gap-2 border-t-2 mt-2 pt-2
        border-zinc-200 dark:border-zinc-600">
        <StdButton
            message="Cancel"
            onClick={() => modalStore.pop()}
            scheme="-1" />

        <StdButton message="Create" onClick={saveEvent} submit={true} />
    </div>
</StdModal>
