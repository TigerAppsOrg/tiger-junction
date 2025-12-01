<script lang="ts">
    import "../app.pcss";
    import { invalidate } from "$app/navigation";
    import { onMount } from "svelte";
    import { browser } from "$app/environment";
    import {
        darkTheme,
        isMobile,
        bgColors,
        bgEffects,
        appFont,
        FONT_OPTIONS,
        type GradientConfig
    } from "$lib/stores/styles";
    import { hslToRGBComponents } from "$lib/scripts/convert";

    // Generate CSS gradient string from gradient configs
    function generateGradientCSS(
        gradients: GradientConfig[],
        globalOpacity: number,
        isDarkMode: boolean,
        darkModeIntensity: number
    ): string {
        if (gradients.length === 0) return "none";

        const opacityMultiplier = isDarkMode ? darkModeIntensity : 1;
        const effectiveOpacity = globalOpacity * opacityMultiplier;

        return gradients
            .map(g => {
                const rgbComponents = hslToRGBComponents(g.color);
                const finalOpacity = effectiveOpacity * g.opacity;
                // Size scales the overall gradient, blur controls the fade softness
                const scaledBlur = (g.size / 100) * g.blur;

                return `radial-gradient(${g.shape} at ${g.x}% ${g.y}%, rgba(${rgbComponents}, ${finalOpacity}) 0%, transparent ${scaledBlur}%)`;
            })
            .join(", ");
    }
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

    // Apply font CSS variable and font-specific body classes
    $: if (browser) {
        const fontOption = FONT_OPTIONS.find(f => f.name === $appFont);
        document.documentElement.style.setProperty(
            "--app-font",
            `"${$appFont}", ${fontOption?.fallback || "sans-serif"}`
        );
        // Add font-specific classes to body for conditional styling
        document.body.classList.remove("font-playfair", "font-jetbrains");
        if ($appFont === "Playfair Display") {
            document.body.classList.add("font-playfair");
        } else if ($appFont === "JetBrains Mono") {
            document.body.classList.add("font-jetbrains");
        }
    }

    // Apply background effects CSS variables
    $: if (browser) {
        const noiseOpacity = $bgEffects.noise.enabled
            ? $darkTheme
                ? Math.min($bgEffects.noise.opacity * 0.16, 0.15) // Much subtler in dark mode
                : $bgEffects.noise.opacity
            : 0;

        document.documentElement.style.setProperty(
            "--noise-opacity",
            String(noiseOpacity)
        );
        document.documentElement.style.setProperty(
            "--noise-frequency",
            String($bgEffects.noise.baseFrequency)
        );

        // Generate and apply dynamic gradient CSS
        const gradientCSS = $bgEffects.glows.enabled
            ? generateGradientCSS(
                  $bgEffects.glows.gradients,
                  $bgEffects.glows.globalOpacity,
                  $darkTheme,
                  $bgEffects.glows.darkModeIntensity
              )
            : "none";
        document.documentElement.style.setProperty(
            "--gradient-background",
            gradientCSS
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
<div>
    <ToastLib />
    <slot />
</div>
