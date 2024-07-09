<script lang="ts">
    import { getContext } from "svelte";
    import { SupabaseClient } from "@supabase/supabase-js";
    import {
        editEvent,
        scheduleEventMap,
        type CustomEvent
    } from "$lib/stores/events";
    import { currentSchedule } from "$lib/stores/recal";
    import { calColors, calculateCssVars } from "$lib/stores/styles";
    import { modalStore } from "$lib/stores/modal";
    import {
        eventHover,
        eventHoverRev,
        hoveredEvent
    } from "../../calendar/calendar";

    const supabase: SupabaseClient = getContext("supabase");

    export let customEvent: CustomEvent;
    export let isSelected: boolean = false;
    export let noBorder: boolean = false;

    const handleHover = () => {
        eventHover.set(customEvent.id);
        hoveredEvent.set(customEvent);
    };

    const handleLeave = () => {
        eventHover.set(null);
        hoveredEvent.set(null);
    };

    $: cssVarStyles = calculateCssVars("E", $calColors);
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
    style={cssVarStyles}
    id="main"
    class="flex items-center justify-between border-zinc-300 h-10 duration-100
    {noBorder ? '' : 'border-b-2'}
    {isSelected ? 'selected' : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'}"
    class:tchover={$eventHoverRev === customEvent.id}
    on:mouseenter={handleHover}
    on:focus={handleHover}
    on:blur={handleLeave}
    on:mouseleave={handleLeave}>
    <div class="w-[60%]">
        <p id="title" class="text-sm">
            {customEvent.title}
        </p>
    </div>

    <div class="w-[30%] flex h-full">
        <button
            class="hover:bg-purple-500 hover:dark:bg-purple-700"
            on:click={() => {
                editEvent.set(customEvent);
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
                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
            </svg>
        </button>
        {#if isSelected}
            <!-- Remove -->
            <button
                class="hover:bg-red-500 hover:dark:bg-red-700"
                on:click={() =>
                    scheduleEventMap.removeFromSchedule(
                        supabase,
                        $currentSchedule,
                        customEvent.id
                    )}>
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
                        d="M5 12h14" />
                </svg>
            </button>
        {:else}
            <!-- Add -->
            <button
                class="hover:bg-blue-500 hover:dark:bg-blue-700"
                on:click={() =>
                    scheduleEventMap.addToSchedule(
                        supabase,
                        $currentSchedule,
                        customEvent.id
                    )}>
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
            </button>
        {/if}
    </div>
</div>

<style lang="postcss">
    .icon {
        @apply w-4 h-4;
    }

    button {
        @apply text-zinc-500 dark:text-zinc-100 h-full
        hover:text-white dark:hover:text-white flex-1
        flex items-center justify-center duration-100;
    }

    .selected {
        background-color: var(--bg);
        color: var(--text);
    }

    .selected:hover {
        background-color: var(--bg-hover);
    }

    .tchover {
        background-color: var(--bg-hover);
    }
</style>
