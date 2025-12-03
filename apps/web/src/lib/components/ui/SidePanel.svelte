<script lang="ts">
    import { onMount } from "svelte";
    import { fly, fade } from "svelte/transition";
    import type { Snippet } from "svelte";

    let {
        open = false,
        title = "",
        width = "320px",
        onclose,
        children
    }: {
        open?: boolean;
        title?: string;
        width?: string;
        onclose?: () => void;
        children?: Snippet;
    } = $props();

    const close = () => {
        onclose?.();
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
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div
        class="fixed inset-0 bg-black/20 z-50"
        transition:fade={{ duration: 200 }}
        onclick={close}>
    </div>

    <!-- Panel -->
    <div
        class="fixed top-0 right-0 h-full panel-bg shadow-xl z-50
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
                onclick={close}
                aria-label="Close panel"
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
            {@render children?.()}
        </div>
    </div>
{/if}

<style lang="postcss">
    .panel-bg {
        background-color: var(--bg-light);
    }
    :global(.dark) .panel-bg {
        background-color: var(--bg-dark);
    }
</style>
