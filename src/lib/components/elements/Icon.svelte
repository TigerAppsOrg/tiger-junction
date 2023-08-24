<script lang="ts">

export let src: string;
export let alt: string;
export let size: string = "h-8";

</script>

<div class="aspect-square w-full justify-center items-center flex">
    <img {src} {alt}
    class="{size} invert">
</div>
