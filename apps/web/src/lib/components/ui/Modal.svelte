<script lang="ts">
    import { modalStore } from "$lib/stores/modal";
    import type { Snippet } from "svelte";

    let {
        showModal,
        style = "",
        children
    }: {
        showModal: boolean;
        style?: string;
        children?: Snippet;
    } = $props();

    let dialog: HTMLDialogElement | undefined = $state();

    $effect(() => {
        if (dialog && showModal) dialog.showModal();
    });

    $effect(() => {
        if (dialog && !showModal) dialog.close();
    });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
<dialog
    class="{style} std-area"
    bind:this={dialog}
    onclose={() => modalStore.pop()}
    onclick={e => {
        if (e.target === dialog) dialog?.close();
    }}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div onclick={e => e.stopPropagation()}>
        {@render children?.()}
    </div>
</dialog>

<style lang="postcss">
    dialog {
        @apply rounded-xl;
        border: none;
        padding: 0;
    }

    dialog::backdrop {
        background: rgba(0, 0, 0, 0.5);
    }

    dialog[open] {
        animation: zoom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes zoom {
        from {
            transform: scale(0.95);
        }
        to {
            transform: scale(1);
        }
    }
</style>
