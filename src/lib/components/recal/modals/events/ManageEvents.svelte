<script lang="ts">
    import StdButton from "$lib/components/ui/StdButton.svelte";
    import StdModal from "$lib/components/ui/StdModal.svelte";
    import { valuesToTimeLabel, valueToDaysStr } from "$lib/scripts/convert";
    import {
        type UserCustomEvent,
        type CustomEventTime,
        customEvents,
        deleteCandidateEvent,
        editEvent
    } from "$lib/stores/events";
    import { modalStore } from "$lib/stores/modal";

    export let showModal: boolean = false;

    const formatTimes = (times: CustomEventTime[]) => {
        return times
            .map(time => {
                let dayStr = valueToDaysStr(time.days);
                if (dayStr === "MTWRF") dayStr = "Everyday";
                return dayStr + " " + valuesToTimeLabel(time.start, time.end);
            })
            .join("; ");
    };

    const handleEdit = (candidate: UserCustomEvent) => {
        editEvent.set(candidate);
        modalStore.push("editEvent");
    };

    const handleDelete = (candidate: UserCustomEvent) => {
        deleteCandidateEvent.set(candidate);
        modalStore.push("deleteEvent");
    };
</script>

<StdModal title="Manage Custom Events" stdClose={true} {showModal}>
    <div class="flex flex-col" slot="main">
        {#if $customEvents.length === 0}
            <p class="text-center">No custom events.</p>
        {:else}
            <h2 class="text-lg font-semibold mb-2">
                {$customEvents.length} Custom {$customEvents.length === 1
                    ? "Event"
                    : "Events"}
            </h2>
            <div
                class="grid md:grid-cols-2 grid-cols-1
                gap-2 md:gap-4">
                {#each $customEvents as event}
                    <div class="bg-zinc-100 dark:bg-zinc-800 rounded-md p-4">
                        <h3 class="text-lg font-semibold">{event.title}</h3>
                        <p class="text-sm mb-2 italic">
                            {formatTimes(event.times)}
                        </p>
                        <div class="flex space-x-2">
                            <button
                                on:click={() => handleEdit(event)}
                                class="action-button bg-blue-500 hover:bg-blue-700">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke-width="1.5"
                                    stroke="currentColor"
                                    class="action-icon">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                </svg>
                                Edit
                            </button>
                            <button
                                on:click={() => handleDelete(event)}
                                class="action-button bg-red-500 hover:bg-red-700">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke-width="1.5"
                                    stroke="currentColor"
                                    class="action-icon">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                </svg>
                                Delete
                            </button>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}

        <StdButton
            className="mt-4"
            message="Create New Event"
            onClick={() => {
                editEvent.set(null);
                modalStore.push("editEvent");
            }}
            scheme="2" />
    </div>
</StdModal>

<style lang="postcss">
    .action-button {
        @apply px-2 rounded-md active:scale-95 duration-150 text-white
        flex items-center gap-1;
    }

    .action-icon {
        @apply w-4 h-4;
    }
</style>
