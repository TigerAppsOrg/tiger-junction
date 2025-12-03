<script lang="ts">
    import { currentSortBy, research, searchSettings } from "$lib/stores/recal";
    import { getStyles } from "$lib/stores/styles";

    let { name = "" }: { name?: string } = $props();

    let sortParam = $derived($searchSettings.sortBy[name]);
    let cssVarStyles = $derived(getStyles("0"));

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

    $effect(() => {
        const s = $currentSortBy;
        if (s == null || s !== name) {
            sortParam.enabled = false;
            sortParam.value = 0;
        }
    });
</script>

<button
    class="info select-none"
    class:checked={sortParam.enabled}
    style={cssVarStyles}
    onclick={handleToggle}>
    {name}{sortParam.enabled ? " — " + sortParam.options[sortParam.value] : ""}
</button>

<style lang="postcss">
    .info {
        @apply rounded-md px-2.5 py-1 text-sm border border-zinc-300
            dark:border-zinc-600;
    }

    .info:hover {
        @apply bg-zinc-200 dark:bg-zinc-700 duration-150;
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
