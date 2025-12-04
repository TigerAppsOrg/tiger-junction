<script lang="ts">
    import { animate } from "animejs";
    import { onMount } from "svelte";

    let {
        color1 = "hsl(330, 100%, 80%)",
        color2 = "hsl(305, 33%, 70%)",
        size = 400,
        class: className = ""
    }: {
        color1?: string;
        color2?: string;
        size?: number;
        class?: string;
    } = $props();

    let pathRef: SVGPathElement;

    // Organic blob paths - generated with https://www.blobmaker.app/
    const blobPaths = [
        "M45.3,-78.1C58.1,-70.3,67.5,-56.5,74.7,-42C81.9,-27.4,86.8,-12,85.7,2.6C84.5,17.2,77.3,31,67.8,42.8C58.3,54.6,46.5,64.4,33.2,71.5C19.9,78.6,5,83,-10.5,82.3C-26,81.6,-42,75.8,-54.8,66.2C-67.5,56.6,-77,43.2,-82.2,28.2C-87.4,13.2,-88.4,-3.4,-84.3,-18.7C-80.2,-34,-71,-48,-58.6,-56.8C-46.1,-65.6,-30.5,-69.2,-15.3,-73.1C0,-77,32.5,-85.8,45.3,-78.1Z",
        "M41.5,-71.6C53.3,-64.2,62.2,-52.1,69.5,-39C76.8,-25.9,82.5,-11.7,82.1,2.3C81.7,16.4,75.2,30.1,66.4,41.8C57.6,53.5,46.5,63.2,33.7,70.1C20.9,77,6.4,81.1,-8.2,80.5C-22.9,79.8,-37.7,74.4,-50.5,66C-63.4,57.5,-74.3,46.1,-80.1,32.4C-85.9,18.7,-86.5,2.7,-83.1,-12.3C-79.7,-27.3,-72.2,-41.2,-61.4,-51.3C-50.6,-61.4,-36.4,-67.6,-22.5,-72.8C-8.6,-78,5.1,-82.1,18.8,-80.5C32.5,-78.8,46.1,-71.4,41.5,-71.6Z",
        "M44.7,-77.2C57.3,-69.7,66.2,-55.6,73.4,-41C80.5,-26.4,85.9,-11.3,84.9,3.1C83.9,17.5,76.5,31.3,67.1,43.3C57.7,55.3,46.3,65.5,33.1,72.3C19.9,79.1,4.9,82.5,-10.3,81.3C-25.5,80.1,-41,74.3,-53.8,65C-66.6,55.7,-76.8,43,-82.5,28.3C-88.2,13.6,-89.4,-3.2,-85,-18.5C-80.6,-33.8,-70.5,-47.6,-57.6,-55.5C-44.6,-63.5,-28.8,-65.6,-14.1,-69.8C0.6,-74,32.1,-84.7,44.7,-77.2Z"
    ];

    onMount(() => {
        const prefersReducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;
        if (prefersReducedMotion || !pathRef) return;

        // Morph between blob shapes using anime.js v4
        animate(pathRef, {
            d: [
                { to: blobPaths[0] },
                { to: blobPaths[1] },
                { to: blobPaths[2] },
                { to: blobPaths[0] }
            ],
            duration: 12000,
            ease: "inOutQuad",
            loop: true
        });
    });
</script>

<div
    class="morphing-blob-container {className}"
    style="width: {size}px; height: {size}px;">
    <svg
        viewBox="-100 -100 200 200"
        class="morphing-blob"
        xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient
                id="blobGradient-{size}"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%">
                <stop offset="0%" style="stop-color: {color1}" />
                <stop offset="100%" style="stop-color: {color2}" />
            </linearGradient>
        </defs>
        <path
            bind:this={pathRef}
            d={blobPaths[0]}
            fill="url(#blobGradient-{size})"
            stroke="black"
            stroke-width="2"
            transform="scale(0.8)" />
    </svg>
</div>

<style lang="postcss">
    .morphing-blob-container {
        position: absolute;
        pointer-events: none;
        opacity: 0.6;
    }

    .morphing-blob {
        width: 100%;
        height: 100%;
        overflow: visible;
    }
</style>
