<script lang="ts">
    import StdButton from "$lib/components/ui/StdButton.svelte";
    import { modalStore } from "$lib/stores/modal";
    import {
        customEvents,
        deleteCandidateEvent,
        scheduleEventMap
    } from "$lib/stores/events";
    import { getContext, onMount } from "svelte";
    import { toastStore } from "$lib/stores/toast";
    import { type SupabaseClient } from "@supabase/supabase-js";
    import StdModal from "$lib/components/ui/StdModal.svelte";

    let { showModal = false }: { showModal?: boolean } = $props();

    const supabase: SupabaseClient = getContext("supabase");

    onMount(() => {
        // Close the modal immediately if no event is selected
        if (!$deleteCandidateEvent) {
            modalStore.pop();
            toastStore.add("error", "No event selected.");
        }
    });

    // While it should be impossible for this to be null, it's better to be safe
    let event = $derived(
        $deleteCandidateEvent
            ? $deleteCandidateEvent
            : {
                  title: "ERROR"
              }
    );

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

<StdModal title="Delete Custom Event" stdClose={false} {showModal}>
    {#snippet main()}
        <p>
            Are you sure you want to delete custom event <span
                class="font-bold">
                {event.title}</span
            >? This action cannot be undone.
        </p>
    {/snippet}

    {#snippet buttons()}
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
    {/snippet}
</StdModal>
