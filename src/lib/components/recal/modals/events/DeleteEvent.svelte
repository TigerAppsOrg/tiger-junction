<script lang="ts">
    import Modal from "$lib/components/elements/Modal.svelte";
    import StdButton from "$lib/components/elements/StdButton.svelte";
    import { modalStore } from "$lib/stores/modal";
    import {
        customEvents,
        deleteCandidateEvent,
        scheduleEventMap
    } from "$lib/stores/events";
    import { getContext, onMount } from "svelte";
    import { toastStore } from "$lib/stores/toast";
    import { SupabaseClient } from "@supabase/supabase-js";

    export let showModal: boolean = false;

    const supabase: SupabaseClient = getContext("supabase");

    onMount(() => {
        // Close the modal immediately if no event is selected
        if (!$deleteCandidateEvent) {
            modalStore.pop();
            toastStore.add("error", "No event selected.");
        }
    });

    // While it should be impossible for this to be null, it's better to be safe
    $: event = $deleteCandidateEvent
        ? $deleteCandidateEvent
        : {
              title: "ERROR"
          };

    // Delete the event from the stores and close the modal
    const handleDelete = async () => {
        if (!$deleteCandidateEvent) {
            modalStore.pop();
            toastStore.add("error", "No event selected.");
            return;
        }
        const status = await customEvents.remove(
            supabase,
            $deleteCandidateEvent.id
        );
        if (!status) {
            toastStore.add("error", "Failed to delete event.");
            return;
        }
        scheduleEventMap.removeFromAllSchedules($deleteCandidateEvent.id);
        modalStore.pop();
        toastStore.add("success", "Event deleted.");
    };
</script>

<Modal {showModal}>
    <div class="p-6 w-[80vw] max-w-4xl">
        <h1 class="text-xl font-bold mb-2">Delete Custom Event</h1>

        <div>
            <p>
                Are you sure you want to delete custom event <span
                    class="font-bold">
                    {event.title}</span
                >? This action cannot be undone.
            </p>
        </div>

        <div
            class="flex gap-2 border-t-2 mt-2 pt-2
            border-zinc-200 dark:border-zinc-600">
            <StdButton
                scheme="-1"
                message="Cancel"
                onClick={() => {
                    modalStore.pop();
                    deleteCandidateEvent.set(null);
                }} />
            <StdButton
                scheme="4"
                message="Delete"
                onClick={handleDelete}
                submit={true} />
        </div>
    </div>
</Modal>
