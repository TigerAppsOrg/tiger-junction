<!-- 
    Standard button component
-->

<script lang="ts">
import { calColors, calculateCssVars, type CalColors } from "$lib/stores/styles";

export let scheme: keyof CalColors = "0";
export let message = "DEFAULT MESSAGE";
export let onClick = () => {};
export let submit = false;

// Handle theme changes
$: cssVarStyles = calculateCssVars(scheme, $calColors)
</script>

<button 
class={scheme} 
on:click={onClick} 
style={cssVarStyles}
type={submit ? "submit" : "button"}>
    {message}
</button>

<style lang="postcss">
button {
    @apply rounded-md py-2 px-4 text-center flex-1 duration-150;
    background-color: var(--bg);
    color: var(--text);
}

button:hover {
    @apply cursor-pointer;
    background-color: var(--bg-hover);
}

button:active {
    @apply transform scale-95;
}

</style>