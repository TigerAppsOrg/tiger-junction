<script lang="ts">
    import StdButton from "$lib/components/ui/StdButton.svelte";
    import StdModal from "$lib/components/ui/StdModal.svelte";
    import { editEvent } from "$lib/stores/events";
    import { modalStore } from "$lib/stores/modal";
    import { toastStore } from "$lib/stores/toast";
    import { onMount } from "svelte";

    export let showModal: boolean = false;

    onMount(() => {
        // Close the modal immediately if no event is selected
        if (!$editEvent) {
            modalStore.pop();
            toastStore.add("error", "No event selected.");
        }
    });

    // While it should be impossible for this to be null, it's better to be safe
    $: event = $editEvent
        ? $editEvent
        : {
              title: "ERROR",
              times: []
          };

    const handleSave = async () => {
        if (!$editEvent) {
            modalStore.pop();
            toastStore.add("error", "No event selected.");
            return;
        }
    };
</script>

<StdModal title="Edit Event" stdClose={false} {showModal}>
    <main slot="main"></main>
    <div
        slot="buttons"
        class="flex gap-2 border-t-2 mt-2 pt-2
    border-zinc-200 dark:border-zinc-600">
        <StdButton
            scheme="-1"
            message="Cancel"
            onClick={() => {
                modalStore.pop();
                editEvent.set(null);
            }} />
        <StdButton
            scheme="0"
            message="Save"
            onClick={handleSave}
            submit={true} />
    </div>
</StdModal>
