<script lang="ts">
import { goto } from "$app/navigation";
import SideNav from "$lib/components/SideNav.svelte";
import Card from "$lib/components/elements/Card.svelte";
import { darkTheme } from "$lib/stores/state";

export let data;
$: dark = $darkTheme;

const handleLogout = async () => { 
    const { error } = await data.supabase.auth.signOut();
    if (!error) goto("/");
}
</script>

<div class="bg h-screen w-screen" class:dark>
    <div class="display h-screen w-screen">
        <SideNav />
        <button on:click={handleLogout} class="p-2 bg-red-400">
            Logout
        </button>
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