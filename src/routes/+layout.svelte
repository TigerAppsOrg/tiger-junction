<script>
import "../app.pcss";
import { invalidate } from "$app/navigation";
import { onMount } from "svelte";
import { darkTheme } from "$lib/stores/state";
import { isMobile } from "$lib/stores/mobile";

export let data;

let { supabase, session } = data;
$: ({ supabase, session } = data);

$: dark = $darkTheme;

onMount(() => {

    // Run any time the window is resized
    // window.addEventListener("resize", () => {
    //     $isMobile = window.innerWidth < 768;
    // });
    $isMobile = window.innerWidth < 600;

    const {
        data: { subscription }
    } = supabase.auth.onAuthStateChange(( event, _session) => {
        if (_session?.expires_at !== session?.expires_at) {
            invalidate("supabase:auth");
        }
    });

    return () => subscription.unsubscribe();
});
</script>

<svelte:head>
    <title>TigerJunction</title>
</svelte:head>

<div class="font-lato" class:dark>
    <slot />
</div>