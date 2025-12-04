<script lang="ts">
    import { animate, stagger } from "animejs";
    import { onMount } from "svelte";

    let {
        mouseX = 0,
        mouseY = 0
    }: {
        mouseX?: number;
        mouseY?: number;
    } = $props();

    let containerRef: HTMLDivElement;
    let gridRef: HTMLDivElement;
    let mounted = $state(false);

    // Calculate tilt based on mouse position relative to center
    let tiltX = $derived(mounted ? (mouseY - window.innerHeight / 2) / 60 : 0);
    let tiltY = $derived(mounted ? (mouseX - window.innerWidth / 2) / 40 : 0);

    // Course block colors
    const colors = {
        green: "hsl(120, 52%, 75%)",
        orange: "hsl(35, 99%, 65%)",
        blue: "hsl(197, 34%, 72%)",
        yellow: "hsl(60, 95%, 74%)",
        pink: "hsl(330, 100%, 80%)",
        purple: "hsl(305, 33%, 70%)"
    };

    // Sample schedule data (5 days x 6 time slots)
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const slots = 6;

    // Course placements - [dayIndex, slotIndex, span, colorKey, label]
    type Course = [number, number, number, keyof typeof colors, string];
    const courses: Course[] = [
        [0, 1, 1, "green", "COS"],
        [1, 0, 2, "orange", "ECO"],
        [1, 3, 1, "blue", "PHY"],
        [2, 1, 1, "green", "COS"],
        [2, 2, 2, "pink", "MUS"],
        [3, 0, 2, "orange", "ECO"],
        [3, 4, 1, "purple", "PHI"],
        [4, 1, 1, "green", "COS"],
        [4, 3, 1, "yellow", "MAT"]
    ];

    function getCourseAt(day: number, slot: number): Course | undefined {
        return courses.find(
            c => c[0] === day && slot >= c[1] && slot < c[1] + c[2]
        );
    }

    function isFirstSlot(day: number, slot: number, course: Course): boolean {
        return course[1] === slot;
    }

    onMount(() => {
        mounted = true;

        const prefersReducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;
        if (prefersReducedMotion) return;

        // Entrance animation for grid cells using anime.js v4
        const cells = containerRef.querySelectorAll(".grid-cell");
        animate(cells, {
            translateZ: ["-50px", "0px"],
            opacity: [0, 1],
            delay: stagger(30, { grid: [5, 6], from: "center" }),
            duration: 600,
            ease: "outQuad"
        });
    });
</script>

<div
    class="calendar-3d-container perspective-container"
    bind:this={containerRef}>
    <div
        class="calendar-grid preserve-3d"
        bind:this={gridRef}
        style="transform: rotateX({tiltX}deg) rotateY({tiltY}deg)">
        <!-- Day headers -->
        <div class="day-headers">
            {#each days as day}
                <div class="day-header">{day}</div>
            {/each}
        </div>

        <!-- Grid -->
        <div class="grid-body">
            {#each Array(slots) as _, slotIndex}
                <div class="grid-row">
                    {#each days as _, dayIndex}
                        {@const course = getCourseAt(dayIndex, slotIndex)}
                        <div
                            class="grid-cell"
                            class:has-course={course !== undefined}>
                            {#if course && isFirstSlot(dayIndex, slotIndex, course)}
                                <div
                                    class="course-block"
                                    style="
                                        background: {colors[course[3]]};
                                        height: calc({course[2]} * 100% + {course[2] -
                                        1} * 4px);
                                    ">
                                    <span class="course-label"
                                        >{course[4]}</span>
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            {/each}
        </div>
    </div>
</div>

<style lang="postcss">
    .calendar-3d-container {
        width: 320px;
        height: 280px;
    }

    .calendar-grid {
        width: 100%;
        height: 100%;
        background: white;
        border: 3px solid black;
        padding: 8px;
        box-shadow: 8px 8px 0 rgba(0, 0, 0, 0.1);
        transition: transform 0.1s ease-out;
    }

    .day-headers {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 4px;
        margin-bottom: 8px;
    }

    .day-header {
        font-family: "Inter", sans-serif;
        font-size: 0.7rem;
        font-weight: 600;
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #666;
    }

    .grid-body {
        display: flex;
        flex-direction: column;
        gap: 4px;
        height: calc(100% - 28px);
    }

    .grid-row {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 4px;
        flex: 1;
    }

    .grid-cell {
        background: #f5f5f5;
        border: 1px solid #e0e0e0;
        position: relative;
        min-height: 28px;
    }

    .course-block {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid black;
        z-index: 1;
    }

    .course-label {
        font-family: "Inter", sans-serif;
        font-size: 0.65rem;
        font-weight: 700;
        color: rgba(0, 0, 0, 0.7);
    }
</style>
