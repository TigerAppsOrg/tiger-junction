<script lang="ts">
import Modal from "$lib/components/elements/Modal.svelte";

export let showModal: boolean = false;

</script>

<Modal {showModal}>
    hello world
</Modal>

<style lang="postcss">
.settings-area {
    @apply p-4 border-t-2
    border-slate-600/30 dark:border-slate-200/30;
}

.btn {
    @apply rounded-md py-2 text-center;
}
</style>