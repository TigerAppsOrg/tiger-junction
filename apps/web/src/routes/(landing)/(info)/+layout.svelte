<script lang="ts">
    import LandingFooter from "../LandingFooter.svelte";
    import LandingHeader from "../LandingHeader.svelte";
    import type { Snippet } from "svelte";

    let { data, children }: { data: any; children?: Snippet } = $props();
</script>

<main class="max-w-screen min-h-screen flex">
    <div class="overlay w-full flex-1 flex flex-col pt-2 items-center">
        <LandingHeader supabase={data.supabase} />
        {@render children?.()}
        <div class="flex-1"></div>
        <LandingFooter />
    </div>
</main>

<style>
    main {
        background-image:
            radial-gradient(18% 28% at 24% 50%, #ff6b6b00 7%, #ff6b6b00 100%),
            radial-gradient(18% 28% at 18% 71%, #ffffff9c 6%, #ff6b6b00 100%),
            radial-gradient(70% 53% at 36% 76%, #4ecdc4ff 0%, #ff6b6b00 100%),
            radial-gradient(42% 53% at 15% 94%, #ffffffff 7%, #ff6b6b00 100%),
            radial-gradient(42% 53% at 34% 72%, #ffffffff 7%, #ff6b6b00 100%),
            radial-gradient(18% 28% at 35% 87%, #c44effcc 7%, #ff6b6b00 100%),
            radial-gradient(31% 43% at 7% 98%, #ffffffff 24%, #ff6b6b00 100%),
            radial-gradient(21% 37% at 72% 23%, #ebb6f0aa 12%, #ff6b6b00 100%),
            radial-gradient(35% 56% at 91% 74%, #c44effcc 9%, #ff6b6b00 100%),
            radial-gradient(74% 86% at 67% 38%, #4ecdc4ff 24%, #ff6b6b00 100%),
            linear-gradient(125deg, #ff6b6bcc 1%, #ffffffff 100%);
        background-size: 120% 200%;
        background-repeat: repeat-y;
    }

    .overlay {
        background-color: rgba(255, 255, 255, 0.7);
    }
</style>
