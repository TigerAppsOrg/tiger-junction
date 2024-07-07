<script lang="ts">
    import StdModal from "$lib/components/elements/StdModal.svelte";
    import { customEvents, scheduleEventMap } from "$lib/stores/events";
    import { currentSchedule } from "$lib/stores/recal";

    export let showModal: boolean = false;
</script>

<StdModal title="Manage Events" stdClose={true} {showModal}>
    <div class="flex flex-col space-y-4">
        {#if $customEvents.length === 0}
            <p class="text-center">No custom events.</p>
        {:else}
            <div class="flex flex-col space-y-2">
                {#each $customEvents as event}
                    <p class="font-bold">{event.title}</p>
                {/each}
            </div>
        {/if}
    </div>
</StdModal>
