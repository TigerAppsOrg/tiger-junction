<script lang="ts">
    import { modalStore } from "$lib/stores/modal";

    let eventCount = 0;
</script>

<div
    class="text-base font-normal dark:text-zinc-100 ml-1
            flex items-center justify-between mt-2">
    <span>
        {eventCount} Custom
        {eventCount === 1 ? "Event" : "Events"}
    </span>
    <button
        on:click={() => modalStore.push("manageEvents")}
        class="flex items-center gap-[1px] text-sm">
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

        <p class="calbut">Add</p>
    </button>
</div>
