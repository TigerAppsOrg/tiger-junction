<script lang="ts">
    import BrutalistButton from "./ui/BrutalistButton.svelte";
    import RotatedText from "./ui/RotatedText.svelte";
    import FloatingShapes from "./animations/FloatingShapes.svelte";
    import MorphingBlob from "./animations/MorphingBlob.svelte";
    import Calendar3D from "./animations/Calendar3D.svelte";
    import ExplodingCards from "./animations/ExplodingCards.svelte";

    let {
        onGetStarted,
        scrollY = 0
    }: {
        onGetStarted: () => void;
        scrollY?: number;
    } = $props();

    let mouseX = $state(0);
    let mouseY = $state(0);
    let mounted = $state(false);

    // Scroll progress for exploding cards (0-1)
    let scrollProgress = $derived(
        mounted ? Math.min(1, Math.max(0, scrollY / 400)) : 0
    );

    function handleMouseMove(e: MouseEvent) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    }

    $effect(() => {
        mounted = true;
    });
</script>

<svelte:window on:mousemove={handleMouseMove} />

<section class="hero" id="hero">
    <!-- Floating shapes background layer -->
    <FloatingShapes />

    <!-- Morphing blobs -->
    <MorphingBlob
        class="blob-1"
        color1="hsl(330, 100%, 85%)"
        color2="hsl(280, 60%, 80%)"
        size={500} />
    <MorphingBlob
        class="blob-2"
        color1="hsl(197, 50%, 80%)"
        color2="hsl(160, 50%, 75%)"
        size={400} />

    <!-- Left rotated text -->
    <div class="sidebar-left">
        <RotatedText text="Princeton Course Planning" direction="up" />
    </div>

    <!-- Main content -->
    <div class="hero-content">
        <div class="headline-container">
            <h1 class="headline-massive">
                <span class="text-line">
                    <span class="word" style="color: #f245c1">Plan</span>
                </span>
                <span class="text-line">
                    <span class="word" style="color: #6485fd">Your</span>
                </span>
                <span class="text-line">
                    <span class="word" style="color: #4ecdc4">Future</span>
                </span>
            </h1>

            <p class="hero-subtitle body-inter">
                Princeton's premier academic planning platform.<br />
                Explore courses, plan your schedule, and succeed.
            </p>

            <div class="hero-cta">
                <BrutalistButton
                    onclick={onGetStarted}
                    variant="primary"
                    size="large">
                    Get Started
                </BrutalistButton>
            </div>
        </div>

        <!-- 3D Calendar and Exploding Cards -->
        <div class="visual-area">
            <div class="calendar-wrapper">
                <Calendar3D {mouseX} {mouseY} />
            </div>
            <div class="cards-wrapper">
                <ExplodingCards {scrollProgress} />
            </div>
        </div>
    </div>

    <!-- Right accent text -->
    <div class="sidebar-right">
        <RotatedText text="ReCal+ by TigerJunction" direction="down" />
    </div>

    <!-- Scroll indicator -->
    <div class="scroll-indicator">
        <span class="scroll-text body-inter">Scroll</span>
        <div class="scroll-line"></div>
    </div>
</section>

<style lang="postcss">
    .hero {
        min-height: 100vh;
        background: white;
        position: relative;
        display: grid;
        grid-template-columns: 60px 1fr 60px;
        overflow: hidden;
    }

    /* Blob positioning */
    :global(.blob-1) {
        top: -100px;
        right: -100px;
    }

    :global(.blob-2) {
        bottom: -50px;
        left: -100px;
    }

    /* Sidebar columns */
    .sidebar-left,
    .sidebar-right {
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
    }

    .sidebar-left {
        border-right: 1px solid #e5e5e5;
    }

    .sidebar-right {
        border-left: 1px solid #e5e5e5;
    }

    /* Main content area */
    .hero-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 120px 60px 60px;
        gap: 40px;
        z-index: 5;
    }

    .headline-container {
        flex: 1;
        max-width: 600px;
    }

    .text-line {
        display: block;
    }

    .word {
        display: inline-block;
        transition: transform 0.3s ease;
    }

    .word:hover {
        transform: translateX(10px);
    }

    .hero-subtitle {
        margin-top: 24px;
        font-size: clamp(1rem, 1.5vw, 1.25rem);
        color: #666;
        line-height: 1.6;
    }

    .hero-cta {
        margin-top: 40px;
    }

    /* Visual area (calendar + cards) */
    .visual-area {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
    }

    .calendar-wrapper {
        position: relative;
        z-index: 2;
    }

    .cards-wrapper {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1;
    }

    /* Scroll indicator */
    .scroll-indicator {
        position: absolute;
        bottom: 40px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        z-index: 10;
    }

    .scroll-text {
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: #999;
    }

    .scroll-line {
        width: 1px;
        height: 40px;
        background: linear-gradient(to bottom, #999, transparent);
        animation: scroll-bounce 2s ease-in-out infinite;
    }

    @keyframes scroll-bounce {
        0%,
        100% {
            transform: scaleY(1);
            opacity: 1;
        }
        50% {
            transform: scaleY(0.5);
            opacity: 0.5;
        }
    }

    /* Responsive */
    @media (max-width: 1024px) {
        .hero {
            grid-template-columns: 40px 1fr 40px;
        }

        .hero-content {
            flex-direction: column;
            text-align: center;
            padding: 100px 30px 60px;
        }

        .visual-area {
            margin-top: 40px;
        }

        .cards-wrapper {
            display: none;
        }
    }

    @media (max-width: 640px) {
        .hero {
            grid-template-columns: 1fr;
        }

        .sidebar-left,
        .sidebar-right {
            display: none;
        }

        .hero-content {
            padding: 100px 20px 60px;
        }

        .calendar-wrapper {
            transform: scale(0.85);
        }
    }
</style>
