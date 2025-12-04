<script lang="ts">
    import { currentSortBy, research, searchSettings } from "$lib/stores/recal";
    import { calColors, getStyles } from "$lib/stores/styles";

    let { name = "" }: { name?: string } = $props();

    // Derive individual properties to ensure reactivity
    let enabled = $derived($searchSettings.sortBy[name]?.enabled ?? false);
    let value = $derived($searchSettings.sortBy[name]?.value ?? 0);
    let options = $derived($searchSettings.sortBy[name]?.options ?? []);

    let cssVarStyles = $derived.by(() => {
        $calColors; // track dependency
        return getStyles("0");
    });

    const handleToggle = () => {
        searchSettings.update(settings => {
            const param = settings.sortBy[name];
            if (param.enabled) {
                if (param.value === param.options.length - 1) {
                    param.value = 0;
                    param.enabled = false;
                    currentSortBy.set(null);
                } else {
                    param.value++;
                }
            } else {
                param.value = 0;
                param.enabled = true;
                currentSortBy.set(name);
            }
            return { ...settings };
        });
        $research = !$research;
    };

    $effect(() => {
        const s = $currentSortBy;
        if (s == null || s !== name) {
            searchSettings.update(settings => {
                settings.sortBy[name].enabled = false;
                settings.sortBy[name].value = 0;
                return { ...settings };
            });
        }
    });
</script>

<button
    class="info select-none"
    class:checked={enabled}
    style={cssVarStyles}
    onclick={handleToggle}>
    {name}{enabled ? " — " + options[value] : ""}
</button>

<style lang="postcss">
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
