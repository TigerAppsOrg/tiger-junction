<script lang='ts'>
import { EMAIL_LIST_FORM_LINK } from "$lib/constants";

</script>

<svelte:head>
    <title>TigerJunction | ReqTree</title>
</svelte:head>

<div class="w-full h-[80vh] flex flex-col justify-center
items-center gradient-text text-5xl font-bold gap-2 text-center">
    <span>
        ReqTree Coming Soon
    </span>
    <a href={EMAIL_LIST_FORM_LINK} target="_blank">
        <button class="btn-cool text-xl">
            Get Notified About Updates
        </button>
    </a>
</div>

<style lang='postcss'>
.gradient-text {
    @apply bg-gradient-to-r from-deepblue-light to-deepblue-dark;
    -webkit-background-clip: text; /* For Safari */
    background-clip: text;
    color: transparent;
}

.btn-cool {
    @apply bg-gradient-to-r from-deepblue-light to-deepblue-dark
    text-white rounded-full px-4 py-2;
}
</style>