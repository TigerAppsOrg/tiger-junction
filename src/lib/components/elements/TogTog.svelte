<script lang="ts">
import { searchSettings } from "$lib/stores/recal";
export let name: string = "";

const handleToggle = (e: Event) => {
    const target = e.target as HTMLInputElement;
    console.log(target);
}

const toggleVal = (index: number) => {
    searchSettings.update((settings) => {
        settings.sortBy[name].value = index;
        return settings;
    });
    console.log(sortParam.value);
}

$: sortParam = $searchSettings.sortBy[name];

</script>

<label for={name}>
    <input type="checkbox" name={name} id={name}
    on:input={handleToggle}
    bind:checked={sortParam.enabled}>

    <span class="info flex items-center gap-1">
        <span>
            {name}
        </span>

        {#if sortParam.enabled}
        <span>
            {#each sortParam.options as option, i}
                {#if i === sortParam.value}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <span class="bg-red-500"
                    on:click={() => toggleVal(i)}>
                        {option}
                    </span>
                    {:else}
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <span class="bg-blue-500"
                    on:click={() => toggleVal(i)}>
                        {option}
                    </span>
                {/if}
            {/each}
        </span>
        {/if}
        
    </span>
</label>

<style lang="postcss">
label {
    @apply inline-block cursor-pointer select-none rounded-full;
}

input[type="checkbox"] {
    @apply hidden;
}

.info {
    @apply rounded-full px-4 py-2 border-2 border-slate-600/30
    dark:border-slate-200/30;
}

input[type="checkbox"]:checked ~ .info {
    @apply bg-green-300 dark:bg-synth-accent border-green-300
    dark:border-synth-accent;
}

.icon {
    @apply hidden;
}

input[type="checkbox"]:checked ~ .info .icon {
    @apply inline-block;
}
</style>