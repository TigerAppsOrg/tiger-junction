<script lang="ts">
import StdModal from "$lib/components/elements/StdModal.svelte";

export let showModal: boolean = false;

</script>

<StdModal title="Theme Palettes" stdClose={true} {showModal}>
    <div class="flex flex-col gap-2" slot="main">

        <div class="settings-area" id="options">
            <h2 class="text-lg font-bold mb-2">Palettes</h2>
        </div>

    </div>
</StdModal>

<style lang="postcss">
.settings-area {
    @apply p-4 border-t-2
    border-slate-600/30 dark:border-slate-200/30;
}
</style>