<script lang="ts">
    import { getContext } from "svelte";
    import { SupabaseClient } from "@supabase/supabase-js";

    import { scheduleEventMap, type CustomEvent } from "$lib/stores/events";
    import { currentSchedule } from "$lib/stores/recal";
    import { calColors, calculateCssVars } from "$lib/stores/styles";

    const supabase: SupabaseClient = getContext("supabase");

    export let customEvent: CustomEvent;
    export let isSelected: boolean = true;

    $: cssVarStyles = calculateCssVars("5", $calColors);
</script>

<div
    style={cssVarStyles}
    id="main"
    class="flex items-center justify-between border-b border-zinc-300 h-10
    {isSelected ? 'selected' : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'}
">
    <div class="w-[75%]">
        {customEvent.title}
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
                class="w-5 h-5">
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
                class="w-5 h-5">
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
        </button>
    {/if}
</div>

<style lang="postcss">
    button {
        @apply text-zinc-300 dark:text-zinc-100 h-full
        hover:text-white dark:hover:text-white;
    }

    .selected {
        background-color: var(--bg);
        color: var(--text);
        border-left: 4px solid var(--border);
    }
</style>
