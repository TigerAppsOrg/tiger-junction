<script lang="ts">
    import { type CustomEvent } from "$lib/stores/events";
    import { calColors, calculateCssVars } from "$lib/stores/styles";

    export let customEvent: CustomEvent;

    let hovered: boolean = false;

    $: cssVarStyles = calculateCssVars("E", $calColors);
</script>

<button
    class="absolute text-left flex p-[1px] rounded-sm
    {hovered ? 'hovered' : ''}"
    style={cssVarStyles}
    on:mouseenter={() => {}}
    on:mouseleave={() => {}}>
</button>

<style>
    button {
        background-color: var(--bg);
        color: var(--text);
        top: var(--top);
        left: var(--left);
        width: var(--height);
        width: var(--width);
    }

    .hovered {
        background-color: var(--bg-hover);
    }
</style>
