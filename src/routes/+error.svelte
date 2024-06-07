<script lang="ts">
    import { page } from "$app/stores";
</script>

<svelte:head>
    <title>TigerJunction | Oh Noes!</title>
    <meta property="og:title" content="TigerJunction | Oh Noes!" />
</svelte:head>

<div class="h-[80vh] flex justify-center items-center">
    <div class="text-center">
        <h1 class="text-9xl mb-2 font-bold">
            <span class="text-std-darkPink">Oh</span>
            <span class="text-std-darkPurple">noes!</span>
        </h1>
        <h2 class="text-5xl mb-8 text-zinc-700 font-light">
            {$page.status}
            {$page.error?.message}
        </h2>
        <a href="/">
            <button class="btn text-2xl"> Go To Homepage → </button>
        </a>
    </div>
</div>

<style lang="postcss">
    .btn {
        @apply rounded-md px-4 py-2 shadow-md hover:shadow-lg
    bg-std-green text-black hover:bg-std-darkGreen duration-150;
    }

    .btn:active {
        @apply transform scale-95;
    }
</style>
