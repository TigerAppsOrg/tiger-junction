<script lang="ts">
    import { searchSettings } from "$lib/stores/recal";
    import { calColors, getStyles, type CalColors } from "$lib/stores/styles";

    let {
        name = "",
        category,
        scheme = "0" as keyof CalColors
    }: {
        name?: string;
        category: string;
        scheme?: keyof CalColors;
    } = $props();

    let cssVarStyles = $derived.by(() => {
        $calColors; // trigger reactivity on color changes
        return getStyles(scheme);
    });
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<label
    tabindex="0"
    for={name}
    style={cssVarStyles}
    onkeydown={event => {
        if (event.key === "Enter" || event.key === " ") {
            category === "filters"
                ? ($searchSettings.filters[name].enabled =
                      !$searchSettings.filters[name].enabled)
                : category === "style"
                  ? ($searchSettings.style[name] = !$searchSettings.style[name])
                  : ($searchSettings.filters[category].values[name] =
                        !$searchSettings.filters[category].values[name]);
        }
    }}>
    {#if category === "filters"}
        <input
            type="checkbox"
            {name}
            id={name}
            bind:checked={$searchSettings.filters[name].enabled} />
    {:else if category === "style"}
        <input
            type="checkbox"
            {name}
            id={name}
            bind:checked={$searchSettings.style[name]} />
    {:else}
        <input
            type="checkbox"
            {name}
            id={name}
            bind:checked={$searchSettings.filters[category].values[name]} />
    {/if}
    <span class="info">
        {category === "Levels" ? name + "00" : name}
    </span>
</label>

<style lang="postcss">
    label {
        @apply inline-block cursor-pointer select-none rounded-md;
    }

    input[type="checkbox"] {
        @apply hidden;
    }

    .info {
        @apply rounded-md px-2.5 py-1 text-sm border border-zinc-300;
    }
    :global(.dark) .info {
        @apply border-zinc-600;
    }

    .info:hover {
        @apply bg-zinc-200 duration-150;
    }
    :global(.dark) .info:hover {
        @apply bg-zinc-700;
    }

    input[type="checkbox"]:checked ~ .info {
        color: var(--text);
        background-color: var(--bg);
        border-color: var(--bg);
    }

    input[type="checkbox"]:checked ~ .info:hover {
        transition-duration: 150ms;
        background-color: var(--bg-hover);
    }
</style>
