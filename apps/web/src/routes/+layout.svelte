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
    import ToastLib from "$lib/components/general/ToastLib.svelte";
    import NoiseFilter from "$lib/components/ui/NoiseFilter.svelte";
    import type { Snippet } from "svelte";

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
                const scaledBlur = (g.size / 100) * g.blur;

                return `radial-gradient(${g.shape} at ${g.x}% ${g.y}%, rgba(${rgbComponents}, ${finalOpacity}) 0%, transparent ${scaledBlur}%)`;
            })
            .join(", ");
    }

    let { data, children }: { data: any; children?: Snippet } = $props();

    let supabase = $derived(data.supabase);
    let session = $derived(data.session);

    // Sync dark mode class on <html> element with the store
    $effect(() => {
        if (browser) {
            if ($darkTheme) {
                document.documentElement.classList.add("dark");
            } else {
                document.documentElement.classList.remove("dark");
            }
        }
    });

    // Apply background color CSS variables
    $effect(() => {
        if (browser) {
            document.documentElement.style.setProperty(
                "--bg-light",
                $bgColors.light
            );
            document.documentElement.style.setProperty("--bg-dark", $bgColors.dark);
        }
    });

    // Apply font CSS variable and font-specific body classes
    $effect(() => {
        if (browser) {
            const fontOption = FONT_OPTIONS.find(f => f.name === $appFont);
            document.documentElement.style.setProperty(
                "--app-font",
                `"${$appFont}", ${fontOption?.fallback || "sans-serif"}`
            );
            document.body.classList.remove("font-playfair", "font-jetbrains");
            if ($appFont === "Playfair Display") {
                document.body.classList.add("font-playfair");
            } else if ($appFont === "JetBrains Mono") {
                document.body.classList.add("font-jetbrains");
            }
        }
    });

    // Apply background effects CSS variables
    $effect(() => {
        if (browser) {
            const noiseOpacity = $bgEffects.noise.enabled
                ? $darkTheme
                    ? Math.min($bgEffects.noise.opacity * 0.16, 0.15)
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
    });

    onMount(() => {
        $isMobile = window.innerWidth < 600;

        const {
            data: { subscription }
        } = supabase.auth.onAuthStateChange((event: string, _session: any) => {
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
    {@render children?.()}
</div>
