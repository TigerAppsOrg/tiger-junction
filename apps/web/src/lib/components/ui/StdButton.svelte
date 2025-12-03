<!--
    Standard button component
-->

<script lang="ts">
    import { getStyles, type CalColors } from "$lib/stores/styles";

    let {
        scheme = "0" as keyof CalColors,
        message = "DEFAULT MESSAGE",
        onClick = () => {},
        submit = false,
        className = ""
    }: {
        scheme?: keyof CalColors;
        message?: string;
        onClick?: () => void;
        submit?: boolean;
        className?: string;
    } = $props();

    // Handle theme changes
    let cssVarStyles = $derived(getStyles(scheme));
</script>

<button
    class={scheme + " " + className}
    onclick={onClick}
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
</style>
