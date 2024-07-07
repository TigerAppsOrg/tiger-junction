<script lang="ts">
    import { getContext } from "svelte";
    import { SupabaseClient } from "@supabase/supabase-js";

    import { scheduleEventMap, type CustomEvent } from "$lib/stores/events";
    import { currentSchedule } from "$lib/stores/recal";
    import { calColors, calculateCssVars } from "$lib/stores/styles";

    const supabase: SupabaseClient = getContext("supabase");

    export let customEvent: CustomEvent;
    export let isSelected: boolean = false;
    export let noBorder: boolean = false;

    $: cssVarStyles = calculateCssVars("5", $calColors);
</script>

<div
    style={cssVarStyles}
    id="main"
    class="flex items-center justify-between border-zinc-300 h-10 duration-100
    {noBorder ? '' : 'border-b-2'}
    {isSelected ? 'selected' : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'}
">
    <div class="w-[75%]">
        <p id="title" class="text-sm">
            {customEvent.title}
        </p>
    </div>

    {#if isSelected}
        <!-- Remove -->
        <button
            class="w-[20%] hover:bg-red-500 hover:dark:bg-red-700"
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
            class="w-[20%] hover:bg-blue-500 hover:dark:bg-blue-700"
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

<style lang="postcss">
    .icon {
        @apply w-4 h-4;
    }

    button {
        @apply text-zinc-500 dark:text-zinc-100 h-full
        hover:text-white dark:hover:text-white
        flex items-center justify-center duration-100;
    }

    .selected {
        background-color: var(--bg);
        color: var(--text);
    }

    .selected:hover {
        background-color: var(--bg-hover);
    }
</style>
