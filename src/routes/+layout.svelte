<script>
    import "../app.pcss";
    import { invalidate } from "$app/navigation";
    import { onMount } from "svelte";
    import { darkTheme } from "$lib/stores/state";
    import { isMobile } from "$lib/stores/mobile";
    import ToastLib from "$lib/components/general/ToastLib.svelte";

    export let data;

    let { supabase, session } = data;
    $: ({ supabase, session } = data);

    $: dark = $darkTheme;

    onMount(() => {
        $isMobile = window.innerWidth < 600;

        const {
            data: { subscription }
        } = supabase.auth.onAuthStateChange((event, _session) => {
            if (_session?.expires_at !== session?.expires_at) {
                invalidate("supabase:auth");
            }
        });

        return () => subscription.unsubscribe();
    });
</script>

<div class="font-lato" class:dark>
    <ToastLib />
    <slot />
</div>
