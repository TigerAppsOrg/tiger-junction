<script>
    import "../app.pcss";
    import { invalidate } from "$app/navigation";
    import { onMount } from "svelte";
    import { browser } from "$app/environment";
    import {
        darkTheme,
        isMobile,
        bgColors,
        bgEffects
    } from "$lib/stores/styles";
    import { hslToRGBComponents } from "$lib/scripts/convert";
    import ToastLib from "$lib/components/general/ToastLib.svelte";
    import NoiseFilter from "$lib/components/ui/NoiseFilter.svelte";

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

    // Apply background color CSS variables
    $: if (browser) {
        document.documentElement.style.setProperty(
            "--bg-light",
            $bgColors.light
        );
        document.documentElement.style.setProperty("--bg-dark", $bgColors.dark);
    }

    // Apply background effects CSS variables
    $: if (browser) {
        const noiseOpacity = $bgEffects.noise.enabled
            ? $darkTheme
                ? Math.min($bgEffects.noise.opacity * 0.16, 0.15) // Much subtler in dark mode
                : $bgEffects.noise.opacity
            : 0;
        const glowOpacity = $bgEffects.glows.enabled
            ? $bgEffects.glows.opacity
            : 0;

        document.documentElement.style.setProperty(
            "--noise-opacity",
            String(noiseOpacity)
        );
        document.documentElement.style.setProperty(
            "--noise-frequency",
            String($bgEffects.noise.baseFrequency)
        );
        document.documentElement.style.setProperty(
            "--glow-opacity",
            String(glowOpacity)
        );
        document.documentElement.style.setProperty(
            "--glow-color-1",
            hslToRGBComponents($bgEffects.glows.color1)
        );
        document.documentElement.style.setProperty(
            "--glow-color-2",
            hslToRGBComponents($bgEffects.glows.color2)
        );
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

<NoiseFilter />
<div class="font-lato">
    <ToastLib />
    <slot />
</div>
