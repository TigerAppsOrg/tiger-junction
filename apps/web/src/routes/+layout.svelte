<script>
    import "../app.pcss";
    import { invalidate } from "$app/navigation";
    import { onMount } from "svelte";
    import { browser } from "$app/environment";
    import { darkTheme, isMobile } from "$lib/stores/styles";
    import ToastLib from "$lib/components/general/ToastLib.svelte";

    export let data;

    let { supabase, session } = data;
    $: ({ supabase, session } = data);

    // Sync dark mode class on <html> element with the store
    $: if (browser) {
        if ($darkTheme) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }

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

<div class="font-lato">
    <ToastLib />
    <slot />
</div>
