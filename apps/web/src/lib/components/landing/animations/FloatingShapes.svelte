<script lang="ts">
    import { animate, stagger } from "animejs";
    import { onMount } from "svelte";

    let containerRef: HTMLDivElement;

    // Course block colors from the app
    const colors = [
        "hsl(120, 52%, 75%)", // green
        "hsl(35, 99%, 65%)", // orange
        "hsl(197, 34%, 72%)", // blue
        "hsl(60, 95%, 74%)", // yellow
        "hsl(330, 100%, 80%)", // pink
        "hsl(305, 33%, 70%)" // purple
    ];

    type Shape = {
        id: number;
        type: "cube" | "sphere" | "triangle";
        color: string;
        x: number;
        y: number;
        size: number;
        delay: number;
    };

    const shapes: Shape[] = [
        {
            id: 1,
            type: "cube",
            color: colors[0],
            x: 10,
            y: 20,
            size: 40,
            delay: 0
        },
        {
            id: 2,
            type: "sphere",
            color: colors[4],
            x: 85,
            y: 15,
            size: 50,
            delay: 500
        },
        {
            id: 3,
            type: "triangle",
            color: colors[1],
            x: 75,
            y: 70,
            size: 35,
            delay: 1000
        },
        {
            id: 4,
            type: "cube",
            color: colors[2],
            x: 20,
            y: 75,
            size: 30,
            delay: 1500
        },
        {
            id: 5,
            type: "sphere",
            color: colors[5],
            x: 90,
            y: 45,
            size: 25,
            delay: 2000
        },
        {
            id: 6,
            type: "triangle",
            color: colors[3],
            x: 5,
            y: 50,
            size: 28,
            delay: 2500
        }
    ];

    onMount(() => {
        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;
        if (prefersReducedMotion) return;

        // Animate each shape
        shapes.forEach(shape => {
            const element = containerRef.querySelector(`#shape-${shape.id}`);
            if (!element) return;

            // Floating animation
            animate(element, {
                translateY: ["-20px", "20px"],
                translateZ: ["-30px", "30px"],
                rotateX: [0, 15],
                rotateY: [0, 360],
                duration: 6000 + shape.delay,
                delay: shape.delay,
                ease: "inOutSine",
                loop: true,
                alternate: true
            });

            // Subtle scale pulse
            animate(element, {
                scale: [1, 1.1],
                duration: 3000 + shape.delay / 2,
                delay: shape.delay,
                ease: "inOutQuad",
                loop: true,
                alternate: true
            });
        });
    });
</script>

<div
    class="floating-shapes-container perspective-container"
    bind:this={containerRef}>
    {#each shapes as shape}
        <div
            id="shape-{shape.id}"
            class="floating-shape preserve-3d gpu-accelerated"
            style="
                left: {shape.x}%;
                top: {shape.y}%;
                width: {shape.size}px;
                height: {shape.size}px;
            ">
            {#if shape.type === "cube"}
                <div
                    class="cube"
                    style="--cube-color: {shape.color}; --cube-size: {shape.size}px">
                    <div class="cube-face front"></div>
                    <div class="cube-face back"></div>
                    <div class="cube-face right"></div>
                    <div class="cube-face left"></div>
                    <div class="cube-face top"></div>
                    <div class="cube-face bottom"></div>
                </div>
            {:else if shape.type === "sphere"}
                <div class="sphere" style="background: {shape.color}"></div>
            {:else if shape.type === "triangle"}
                <svg viewBox="0 0 100 100" class="triangle">
                    <polygon
                        points="50,10 90,90 10,90"
                        fill={shape.color}
                        stroke="black"
                        stroke-width="3" />
                </svg>
            {/if}
        </div>
    {/each}
</div>

<style lang="postcss">
    .floating-shapes-container {
        position: absolute;
        inset: 0;
        overflow: hidden;
        pointer-events: none;
        z-index: 1;
    }

    .floating-shape {
        position: absolute;
        transform-style: preserve-3d;
    }

    /* Cube styles */
    .cube {
        width: var(--cube-size);
        height: var(--cube-size);
        position: relative;
        transform-style: preserve-3d;
        transform: translateZ(calc(var(--cube-size) / -2));
    }

    .cube-face {
        position: absolute;
        width: var(--cube-size);
        height: var(--cube-size);
        background: var(--cube-color);
        border: 2px solid black;
        opacity: 0.9;
    }

    .cube-face.front {
        transform: translateZ(calc(var(--cube-size) / 2));
    }
    .cube-face.back {
        transform: rotateY(180deg) translateZ(calc(var(--cube-size) / 2));
    }
    .cube-face.right {
        transform: rotateY(90deg) translateZ(calc(var(--cube-size) / 2));
    }
    .cube-face.left {
        transform: rotateY(-90deg) translateZ(calc(var(--cube-size) / 2));
    }
    .cube-face.top {
        transform: rotateX(90deg) translateZ(calc(var(--cube-size) / 2));
    }
    .cube-face.bottom {
        transform: rotateX(-90deg) translateZ(calc(var(--cube-size) / 2));
    }

    /* Sphere styles */
    .sphere {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 3px solid black;
        box-shadow: inset -10px -10px 30px rgba(0, 0, 0, 0.2);
    }

    /* Triangle styles */
    .triangle {
        width: 100%;
        height: 100%;
    }
</style>
