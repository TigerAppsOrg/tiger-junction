<script lang="ts">
    export let href = "";
    export let title = "";
    export let hoverColor: string = "rgba(0, 0, 0, 0.1)";
    export let hoverText: string = "rgba(0, 0, 0, 0.1)";
    export let borderColor: string = "rgba(0, 0, 0, 0.1)";

    let cssHoverColor = `--hoverColor:${hoverColor}`;
    let cssHoverText = `--hoverText:${hoverText}`;
    let cssBorder = `--borderColor:${borderColor}`;
    let css = `${cssHoverColor};${cssHoverText};${cssBorder}`;
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
            <slot></slot>
        </div>
    </div>
</a>

<style lang="postcss">
    a {
        border-color: var(--borderColor);
    }

    a:hover {
        background-color: var(--hoverColor);
        color: var(--hoverText);
    }
</style>
