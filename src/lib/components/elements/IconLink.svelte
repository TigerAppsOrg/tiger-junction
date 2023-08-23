<script lang="ts">

export let href: string;
export let src: string;
export let alt: string;
export let selected: boolean = false;
export let size: string = "h-8";

</script>

<a {href} class="aspect-square w-full justify-center items-center flex">
    <div class:selected 
    class="w-[80%] h-[80%] flex justify-center items-center">
        <img {src} {alt}
        class="{size}"
        class:bright={selected} class:dim={!selected}>
    </div>
</a>

<style lang="postcss">
/* Utilizes: https://codepen.io/sosuke/pen/Pjoqqp */
/* .bright {
    @apply ;
} */

.selected {
    @apply bg-white rounded-full;
}

.dim {
    @apply dark:invert-[.60] invert;
}
</style>