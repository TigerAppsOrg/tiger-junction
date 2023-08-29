<script lang="ts">
import { modalStore } from "$lib/stores/modal";

export let showModal: boolean;
export let style: string = "";

let dialog: HTMLDialogElement;

$: if (dialog && showModal) dialog.showModal();
$: if (dialog && !showModal) dialog.close();
</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
<dialog class="{style} std-area"
	bind:this={dialog}
	on:close={() => modalStore.close()}
	on:click|self={() => dialog.close()}>
    
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div on:click|stopPropagation>
		<slot />
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

dialog[open]::backdrop {
    animation: fade 0.2s ease-out;
}

@keyframes fade {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}
</style>