<script lang="ts">

export let href: string;
export let src: string;
export let alt: string;
export let selected: boolean = false;

</script>

<a {href} class:selected class:unselected={!selected}
class="aspect-square w-full justify-center items-center flex border-l-4">
    <img {src} {alt}
    class="h-10 mr-1"
    class:bright={selected} class:dim={!selected}>
</a>

<style lang="postcss">
    .selected {
        @apply dark:border-white border-primary;
    }

    .unselected {
        @apply dark:border-synth-dark border-slate-200;
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