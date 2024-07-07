<script lang="ts">
    import { modalStore } from "$lib/stores/modal";
    import {
        type CustomEvent,
        customEvents,
        editEvent,
        scheduleEventMap
    } from "$lib/stores/events";
    import { currentSchedule } from "$lib/stores/recal";
    import EventCard from "./elements/EventCard.svelte";
    import { calColors, calculateCssVars } from "$lib/stores/styles";
    import { slide } from "svelte/transition";

    let scheduleEvents: CustomEvent[] = [];
    $: scheduleEvents = $scheduleEventMap[$currentSchedule] || [];
    $: notInSchedule = $customEvents.filter(
        event => !scheduleEvents.some(e => e.id === event.id)
    );

    let showAll: boolean = true;
    $: cssVarStyles = calculateCssVars("6", $calColors);
</script>

<div style={cssVarStyles}>
    <div
        class="text-base font-normal dark:text-zinc-100 ml-1
                flex items-center justify-between mt-4">
        <span>
            {scheduleEvents.length} Custom
            {scheduleEvents.length === 1 ? "Event" : "Events"}
        </span>
        <button
            on:click={() => (showAll = !showAll)}
            class="flex items-center gap-[1px] text-sm">
            {#if showAll}
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
    {#if showAll}
        <div
            transition:slide={{ duration: 200, axis: "y" }}
            class="overflow-hidden">
            <button
                id="addButton"
                class="w-full text-sm py-1 mt-1 active:scale-95 duration-150
                mb-2 flex items-center gap-2 justify-center rounded-md"
                on:click={() => {
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
                <span> Add Event </span>
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
                        {#each scheduleEvents as event, i}
                            <EventCard
                                customEvent={event}
                                noBorder={i === scheduleEvents.length - 1}
                                isSelected={true} />
                        {/each}
                    </div>
                {/if}
            </div>

            <div>
                {#if notInSchedule.length === 0}
                    <p class="text-sm">No events available.</p>
                {:else}
                    <h2 class="text-sm">
                        {notInSchedule.length} Available
                        {notInSchedule.length === 1 ? "Event" : "Events"}
                    </h2>
                    <div class="border-2 rounded-sm">
                        {#each notInSchedule as event, i}
                            <EventCard
                                customEvent={event}
                                noBorder={i === notInSchedule.length - 1}
                                isSelected={false} />
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    {/if}
</div>

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
