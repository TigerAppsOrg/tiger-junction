<script lang="ts">
import { searchSettings } from "$lib/stores/recal";
export let name: string = "";

const handleToggle = () => {
    if (sortParam.enabled) {
        if (sortParam.value === sortParam.options.length - 1) {
            sortParam.value = 0;
            sortParam.enabled = false;
        } else sortParam.value++;
    } else {
        sortParam.value = 0;
        sortParam.enabled = true;
    }
}

$: sortParam = $searchSettings.sortBy[name];
</script>


<button class="info flex items-center gap-2" class:checked={sortParam.enabled}
on:click={handleToggle}>
    {name}
    {sortParam.enabled ? " — " + sortParam.options[sortParam.value] : ""}
    {#if sortParam.enabled}
    <span>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
        class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>              
    </span>
    {/if}
</button>



<style lang="postcss">
.info {
    @apply rounded-full px-4 py-2 border-2 border-slate-600/30
    dark:border-slate-200/30;
}

.checked {
    @apply bg-green-300 dark:bg-synth-accent border-green-300
    dark:border-synth-accent;
}
</style>