<script lang="ts">
import SideNav from "$lib/components/SideNav.svelte";
import Card from "$lib/components/elements/Card.svelte";
import { darkTheme } from "$lib/stores/state";

$: dark = $darkTheme;
</script>

<div class="bg h-screen w-screen" class:dark>
    <div class="display h-screen w-screen">
        <SideNav />
        <main>
            <Card>Hello, World!</Card>
        </main>
    </div>
</div>

<style lang="postcss">
    .bg {
        @apply bg-gradient-to-br from-blue-500 to-purple-500
    }

    .display {
        @apply backdrop-blur-md bg-white/90 dark:bg-black/90;
    }

</style>