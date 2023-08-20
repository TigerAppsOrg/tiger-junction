<script lang="ts">

export let href: string;
export let src: string;
export let alt: string;
export let text: string;
export let selected: boolean = false;
export let size: string = "h-8";

</script>

<a {href} class:selected class:unselected={!selected}
class="h-12 w-full justify-center items-center flex border-l-4">
    <div class="flex justify-start items-center gap-1 w-full">
        <img {src} {alt}
        class="{size} mr-1"
        class:bright={selected} class:dim={!selected}>
        <span class="font-light text-lg">{text}</span>
    </div> <!-- * Left -->

    <div>
        <slot />
    </div> <!-- * Right -->
</a>

<style lang="postcss">
    .selected {
        @apply dark:border-slate-200 border-primary 
        text-primary dark:text-slate-200;
    }

    .unselected {
        @apply dark:border-synth-dark border-slate-200
        dark:text-slate-400 text-slate-600;
    }

    /* Utilizes: https://codepen.io/sosuke/pen/Pjoqqp */
    .bright {
        @apply dark:invert;
        filter: invert(47%) sepia(91%) saturate(1892%) hue-rotate(207deg) brightness(100%) contrast(99%);
    }

    .dim {
        @apply dark:invert-[.60] invert-[.40]
    }
</style>