<script lang="ts">
    import { searchSettings } from "$lib/stores/recal";
    import { getStyles } from "$lib/stores/styles";
    export let name: string = "";
    export let category: string;

    $: cssVarStyles = getStyles("0");
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<label
    tabindex="0"
    for={name}
    style={cssVarStyles}
    on:keydown={event => {
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
    <span class="info flex items-center gap-1">
        <span>
            {category === "Levels" ? name + "00" : name}
        </span>
        <span class="icon">
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
        @apply rounded-full px-4 py-2 border-2 border-zinc-600/30
    dark:border-zinc-200/30;
    }

    .info:hover {
        @apply bg-zinc-200 dark:bg-zinc-700 border-zinc-600/30
    dark:border-zinc-200/30 duration-150;
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

    .icon {
        @apply hidden;
    }

    input[type="checkbox"]:checked ~ .info .icon {
        @apply inline-block;
    }
</style>
