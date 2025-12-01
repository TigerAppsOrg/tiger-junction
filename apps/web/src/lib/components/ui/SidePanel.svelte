<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import { fly, fade } from "svelte/transition";

    export let open: boolean = false;
    export let title: string = "";
    export let width: string = "320px";

    const dispatch = createEventDispatcher();

    const close = () => {
        dispatch("close");
    };

    const handleKeydown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && open) {
            close();
        }
    };

    onMount(() => {
        document.addEventListener("keydown", handleKeydown);
        return () => document.removeEventListener("keydown", handleKeydown);
    });
</script>

{#if open}
    <!-- Backdrop -->
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
    <div
        class="fixed inset-0 bg-black/10 z-50"
        transition:fade={{ duration: 200 }}
        on:click={close} />

    <!-- Panel -->
    <div
        class="fixed top-0 right-0 h-full bg-white dark:bg-zinc-900 shadow-xl z-50
               border-l-2 border-zinc-300 dark:border-zinc-700
               flex flex-col overflow-hidden"
        style="width: {width};"
        transition:fly={{ x: 320, duration: 200, opacity: 1 }}>
        <!-- Header -->
        <div
            class="flex items-center justify-between p-4 border-b
                    border-zinc-200 dark:border-zinc-700">
            <h2 class="text-lg font-semibold dark:text-zinc-100">{title}</h2>
            <button
                on:click={close}
                class="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800
                       text-zinc-500 dark:text-zinc-400 transition-colors">
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
                        d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto">
            <slot />
        </div>
    </div>
{/if}
