<script lang="ts">
    import { getContext } from "svelte";
    import { SupabaseClient } from "@supabase/supabase-js";

    import { scheduleEventMap, type CustomEvent } from "$lib/stores/events";
    import { currentSchedule } from "$lib/stores/recal";

    const supabase: SupabaseClient = getContext("supabase");

    export let customEvent: CustomEvent;
</script>

<div class="flex items-center justify-between p-2 border-b border-zinc-300">
    <div class="w-[75%]">
        {customEvent.title}
    </div>
    <button
        class="w-[20%]"
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
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14" />
        </svg>
    </button>
</div>
