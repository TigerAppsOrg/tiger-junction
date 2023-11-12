<script lang="ts">
import StdModal from "$lib/components/elements/StdModal.svelte";
import { colorPalettes } from "$lib/scripts/ReCal+/palettes";
import Palette from "../elements/cards/Palette.svelte";

export let showModal: boolean = false;

</script>

<StdModal title="Themes" stdClose={true} {showModal}>
    <div class="flex flex-col gap-2" slot="main">

        <div class="settings-area flex gap-2 flex-wrap justify-center">
            {#each Object.keys(colorPalettes) as palette}
                <Palette colors={colorPalettes[palette]} title={palette} />
            {/each}
        </div>
    </div>
</StdModal>

<style lang="postcss">
.settings-area {
    @apply p-4 border-t-2
    border-slate-600/30 dark:border-slate-200/30;
}
</style>