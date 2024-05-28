<script>
    import LandingFooter from "../LandingFooter.svelte";
    import LandingHeader from "../LandingHeader.svelte";

    export let data;
</script>
<main class="max-w-screen min-h-screen flex">
    <div class="overlay w-full flex-1 flex flex-col pt-2 items-center">
        <LandingHeader supabase={data.supabase} />
        <slot />
        <div class="flex-1"></div>
        <LandingFooter />
    </div>
</main>

<style>
    main {
        background-image: radial-gradient(18% 28% at 24% 50%, #FF6B6B00 7%, #FF6B6B00 100%),
                            radial-gradient(18% 28% at 18% 71%, #FFFFFF9C 6%, #FF6B6B00 100%),
                            radial-gradient(70% 53% at 36% 76%, #4ECDC4FF 0%, #FF6B6B00 100%),
                            radial-gradient(42% 53% at 15% 94%, #FFFFFFFF 7%, #FF6B6B00 100%),
                            radial-gradient(42% 53% at 34% 72%, #FFFFFFFF 7%, #FF6B6B00 100%),
                            radial-gradient(18% 28% at 35% 87%, #C44EFFCC 7%, #FF6B6B00 100%),
                            radial-gradient(31% 43% at 7% 98%, #FFFFFFFF 24%, #FF6B6B00 100%),
                            radial-gradient(21% 37% at 72% 23%, #ebb6f0aa 12%, #FF6B6B00 100%),
                            radial-gradient(35% 56% at 91% 74%, #C44EFFCC 9%, #FF6B6B00 100%),
                            radial-gradient(74% 86% at 67% 38%, #4ECDC4FF 24%, #FF6B6B00 100%),
                            linear-gradient(125deg, #FF6B6BCC 1%, #FFFFFFFF 100%);
        background-size: 120% 200%;
        background-repeat: repeat-y;
    }

    .overlay {
        background-color: rgba(255, 255, 255, 0.7);
    }
</style>