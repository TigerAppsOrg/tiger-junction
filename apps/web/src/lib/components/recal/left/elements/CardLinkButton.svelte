<script lang="ts">
    import type { Snippet } from "svelte";

    let {
        href = "",
        title = "",
        hoverColor = "rgba(0, 0, 0, 0.1)",
        hoverText = "rgba(0, 0, 0, 0.1)",
        borderColor = "rgba(0, 0, 0, 0.1)",
        children
    }: {
        href?: string;
        title?: string;
        hoverColor?: string;
        hoverText?: string;
        borderColor?: string;
        children?: Snippet;
    } = $props();

    let css = $derived(
        `--hoverColor:${hoverColor};--hoverText:${hoverText};--borderColor:${borderColor}`
    );
</script>

<a
    {href}
    style={css}
    target="_blank"
    class="w-full flex items-center p-1 border-t-2">
    <div class="flex w-full justify-between text-xs">
        <div class="flex items-center">
            {title}
        </div>
        <div>
            {@render children?.()}
        </div>
    </div>
</a>

<style lang="postcss">
    :global(.dark) a {
        @apply border-zinc-800;
    }

    a:hover {
        background-color: var(--hoverColor);
        color: var(--hoverText);
    }
</style>
