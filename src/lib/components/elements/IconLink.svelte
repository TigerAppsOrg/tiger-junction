<script lang="ts">

export let href: string;
export let src: string;
export let alt: string;

</script>

<a {href} 
class="aspect-square w-full justify-center items-center flex">
    <img {src} {alt}
    class="dark:invert h-10 invert-[.10]">
</a>
