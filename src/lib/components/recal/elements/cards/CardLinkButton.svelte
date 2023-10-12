<script lang="ts">
export let href = "";
export let title = "";
export let hoverColor: string = "rgba(0, 0, 0, 0.1)";
export let hoverText: string = "rgba(0, 0, 0, 0.1)";

let cssHoverColor = `--hoverColor:${hoverColor}`;
let cssHoverText = `--hoverText:${hoverText}`;
let css = `${cssHoverColor};${cssHoverText}`;
</script>


<a {href} style={css} target="_blank" 
class="w-full flex items-center p-1 border-t-2 border-slate-300
dark:border-slate-600">
    <div class="flex w-full justify-between text-xs">
        <div class="flex items-center">
            {title}
        </div>
        <div class="invert-[0.5] dark:invert-[0.7]">
            <slot></slot>
        </div>
    </div>
</a>

<style lang="postcss">

a:hover {
    background-color: var(--hoverColor);
    color: var(--hoverText);
}

</style>