<script lang="ts">
    import { bgEffects } from "$lib/stores/styles";
</script>

<!-- SVG Noise Filter Definition - Hidden but available app-wide -->
<svg style="position: absolute; width: 0; height: 0;">
    <defs>
        <filter id="pageNoise">
            <feTurbulence
                type="fractalNoise"
                baseFrequency={$bgEffects.noise.baseFrequency}
                numOctaves="6"
                stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
                <feFuncA type="discrete" tableValues="0 0 0 1 1" />
            </feComponentTransfer>
        </filter>
    </defs>
</svg>
