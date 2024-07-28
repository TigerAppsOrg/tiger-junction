<script lang="ts">
    import { rgbToHSL } from "$lib/scripts/convert";
    import { darkTheme, calColors, type CalColors } from "$lib/stores/styles";

    // 8 Colors in rgb format
    export let colors: CalColors = {
        "-1": "#000000",
        "0": "#ff0000",
        "1": "#ff8000",
        "2": "#ffff00",
        "3": "#00ff00",
        "4": "#0000ff",
        "5": "#4b0082",
        "6": "#800080",
        "E": "#808080"
    };

    export let title: string = "Palette";

    /**
     * Save colors to store
     */
    const handleClick = () => {
        let hslColors: CalColors = Object.entries(colors)
            .map(([key, value]) => [key, rgbToHSL(value)])
            .reduce(
                (acc, [key, value]) => ({ ...acc, [key]: value }),
                {}
            ) as CalColors;

        if (title === "Midnight" || title === "Cobalt" || title === "Shadow")
            darkTheme.set(true);
        else darkTheme.set(false);

        calColors.set(hslColors);
    };

    // E is always first, -1 is always last
    $: sortedColors = Object.entries(colors)
        .sort(([a], [b]) => {
            if (a === "E") return -1;
            if (b === "E") return 1;
            if (a === "-1") return 1;
            if (b === "-1") return -1;
            return parseInt(a) - parseInt(b);
        })
        .map(([_, value]) => value);
</script>

<!-- Display 7 main colors on top in columns, and then the preview color underneath -->
<button class="border" on:click={handleClick}>
    <div class="flex flex-col">
        <div class="flex flex-col">
            {#each sortedColors as color}
                <div class="w-36 h-4" style="background-color: {color}"></div>
            {/each}
        </div>
        <div class="font-normal p-1">
            {title}
        </div>
    </div>
</button>

<style lang="postcss">
    .border {
        @apply border-2 rounded-md overflow-clip
    border-zinc-600/30 dark:border-zinc-200/30;
    }

    .border:hover {
        @apply border-zinc-600/50 dark:border-zinc-200/50
    transform  duration-150;
    }
</style>
