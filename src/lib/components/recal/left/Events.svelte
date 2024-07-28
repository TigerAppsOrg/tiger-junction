<script lang="ts">
    import { modalStore } from "$lib/stores/modal";
    import {
        type UserCustomEvent,
        customEvents,
        editEvent,
        scheduleEventMap
    } from "$lib/stores/events";
    import { currentSchedule, ready } from "$lib/stores/recal";
    import EventCard from "./elements/EventCard.svelte";
    import { getStyles, isEventOpen } from "$lib/stores/styles";
    import { slide } from "svelte/transition";
    import Loader from "$lib/components/ui/Loader.svelte";
    import { toastStore } from "$lib/stores/toast";

    let scheduleEvents: UserCustomEvent[] = [];
    $: scheduleEvents =
        $scheduleEventMap &&
        $currentSchedule &&
        $customEvents &&
        Object.keys($scheduleEventMap).length > 0
            ? scheduleEventMap.getSchedule($currentSchedule)
            : [];

    $: notInSchedule = $customEvents.filter(
        event => !scheduleEvents.some(e => e.id === event.id)
    );

    $: cssVarStyles = getStyles("6");
</script>

{#if $ready}
    <div style={cssVarStyles} class="dark:text-zinc-100 overflow-y-auto h-full">
        <div
            class="text-base font-normal ml-1
                flex items-center justify-between mt-4">
            <span>
                {scheduleEvents.length} Custom
                {scheduleEvents.length === 1 ? "Event" : "Events"}
            </span>
            <button
                on:click={() => ($isEventOpen = !$isEventOpen)}
                class="flex items-center gap-[1px] text-sm">
                {#if $isEventOpen}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="currentColor"
                        class="icon">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="m4.5 18.75 7.5-7.5 7.5 7.5" />
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="m4.5 12.75 7.5-7.5 7.5 7.5" />
                    </svg>

                    <p>Hide</p>
                {:else}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="currentColor"
                        class="icon">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="m4.5 5.25 7.5 7.5 7.5-7.5m-15 6 7.5 7.5 7.5-7.5" />
                    </svg>
                    <p>Show</p>
                {/if}
            </button>
        </div>
        {#if $isEventOpen}
            <div
                transition:slide={{ duration: 200, axis: "y" }}
                class="overflow-hidden">
                <button
                    id="addButton"
                    class="w-full text-sm py-1 mt-1 duration-150
                mb-2 flex items-center gap-2 justify-center rounded-full"
                    on:click={() => {
                        if (customEvents.isAtMax()) {
                            toastStore.add(
                                "error",
                                "You have reached the maximum number of custom events (100)."
                            );
                            return;
                        }
                        editEvent.set(null);
                        modalStore.push("editEvent");
                    }}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="currentColor"
                        class="icon">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span> New Event </span>
                </button>

                <div class="mb-2">
                    {#if scheduleEvents.length === 0}
                        <p class="text-sm">No events added yet.</p>
                    {:else}
                        <h2 class="text-sm">
                            {scheduleEvents.length} Added
                            {scheduleEvents.length === 1 ? "Event" : "Events"}
                        </h2>
                        <div class="rounded-sm">
                            {#each scheduleEvents as event}
                                <EventCard
                                    customEvent={event}
                                    isSelected={true} />
                            {/each}
                        </div>
                    {/if}
                </div>

                <div>
                    {#if notInSchedule.length === 0}
                        <p class="text-sm mb-1">No events available.</p>
                    {:else}
                        <h2 class="text-sm">
                            {notInSchedule.length} Available
                            {notInSchedule.length === 1 ? "Event" : "Events"}
                        </h2>
                        <div class="border-2 rounded-sm">
                            {#each notInSchedule as event}
                                <EventCard
                                    customEvent={event}
                                    isSelected={false} />
                            {/each}
                        </div>
                    {/if}
                </div>
            </div>
        {/if}
    </div>
{:else}
    <div class="flex items-center gap-2 mt-2">
        <Loader />
        <span> Loading... </span>
    </div>
{/if}

<style lang="postcss">
    .icon {
        @apply w-5 h-5;
    }

    #addButton {
        background-color: var(--bg);
        color: var(--text);
    }

    #addButton:hover {
        background-color: var(--bg-hover);
    }
</style>
