<script lang="ts">
    import { currentSortBy, research, searchSettings } from "$lib/stores/recal";
    import { getStyles } from "$lib/stores/styles";
    export let name: string = "";

    const handleToggle = () => {
        if (sortParam.enabled) {
            if (sortParam.value === sortParam.options.length - 1) {
                sortParam.value = 0;
                sortParam.enabled = false;
                currentSortBy.set(null);
            } else sortParam.value++;
        } else {
            sortParam.value = 0;
            sortParam.enabled = true;
            currentSortBy.set(name);
        }
        $research = !$research;
    };

    $: sortParam = $searchSettings.sortBy[name];

    $: handleFilterChange($currentSortBy);
    const handleFilterChange = (s: null | string) => {
        if (s == null || s !== name) {
            sortParam.enabled = false;
            sortParam.value = 0;
        }
    };

    $: cssVarStyles = getStyles("0");
</script>

<button
    class="info flex items-center gap-2 select-none"
    class:checked={sortParam.enabled}
    style={cssVarStyles}
    on:click={handleToggle}>
    {name}
    {sortParam.enabled ? " — " + sortParam.options[sortParam.value] : ""}
    {#if sortParam.enabled}
        <span>
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
                    d="M4.5 12.75l6 6 9-13.5" />
            </svg>
        </span>
    {/if}
</button>

<style lang="postcss">
    .info {
        @apply rounded-full px-4 py-2 border-2 border-zinc-600/30
    dark:border-zinc-200/30;
    }

    .info:hover {
        @apply bg-zinc-200 dark:bg-zinc-700 border-zinc-600/30
    dark:border-zinc-200/30 duration-150;
    }

    .checked {
        color: var(--text);
        background-color: var(--bg);
        border-color: var(--bg);
    }

    .checked:hover {
        transition-duration: 150ms;
        background-color: var(--bg-hover);
    }
</style>
