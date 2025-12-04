<script lang="ts">
    import { handleLogin } from "$lib/scripts/supabase.js";
    import { onMount } from "svelte";
    import { animate, stagger } from "animejs";
    import LandingFooter from "./LandingFooter.svelte";
    import FloatingShapes from "$lib/components/landing/animations/FloatingShapes.svelte";
    import MorphingBlob from "$lib/components/landing/animations/MorphingBlob.svelte";
    import Calendar3D from "$lib/components/landing/animations/Calendar3D.svelte";

    let { data }: { data: any } = $props();

    let scrollY = $state(0);
    let mouseX = $state(0);
    let mouseY = $state(0);
    let windowHeight = $state(800);
    let mounted = $state(false);

    // Scroll progress (0 = top, 1 = one viewport down, etc.)
    let scrollProgress = $derived(mounted ? scrollY / windowHeight : 0);

    // Parallax values for different elements
    let heroOpacity = $derived(Math.max(0, 1 - scrollProgress * 1.5));
    let heroScale = $derived(1 - scrollProgress * 0.1);
    let heroY = $derived(scrollProgress * 100);

    // Feature section animations (start at 0.3 scroll progress)
    let featureProgress = $derived(
        Math.max(0, Math.min(1, (scrollProgress - 0.3) * 2))
    );

    // Individual feature animations with stagger
    let feature1Progress = $derived(
        Math.max(0, Math.min(1, (scrollProgress - 0.4) * 3))
    );
    let feature2Progress = $derived(
        Math.max(0, Math.min(1, (scrollProgress - 0.6) * 3))
    );
    let feature3Progress = $derived(
        Math.max(0, Math.min(1, (scrollProgress - 0.8) * 3))
    );

    // CTA section (starts at 1.2 scroll progress)
    let ctaProgress = $derived(
        Math.max(0, Math.min(1, (scrollProgress - 1.0) * 2))
    );

    function handleMouseMove(e: MouseEvent) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    }

    onMount(() => {
        mounted = true;
        windowHeight = window.innerHeight;

        // Entrance animations
        animate(".hero-title span", {
            translateY: ["100%", "0%"],
            opacity: [0, 1],
            delay: stagger(100),
            duration: 800,
            ease: "outQuart"
        });

        animate(".hero-subtitle", {
            opacity: [0, 1],
            translateY: ["20px", "0px"],
            delay: 600,
            duration: 600,
            ease: "outQuart"
        });

        animate(".hero-cta", {
            opacity: [0, 1],
            delay: 900,
            duration: 600
        });

        const handleResize = () => {
            windowHeight = window.innerHeight;
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    });
</script>

<svelte:window bind:scrollY on:mousemove={handleMouseMove} />

<svelte:head>
    <title>TigerJunction | Next-Gen Course Planning</title>
    <meta
        name="description"
        content="TigerJunction is a platform for effortless course planning at Princeton University." />
</svelte:head>

<div class="landing-page">
    <!-- Fixed header -->
    <header
        class="fixed-header"
        style="opacity: {Math.min(1, 0.3 + scrollProgress * 0.7)}">
        <a href="/" class="logo">
            <img src="/tjlogonew.png" alt="TigerJunction" class="logo-img" />
            <span class="logo-text">TigerJunction</span>
        </a>
        <button class="login-link" onclick={() => handleLogin(data.supabase)}>
            Log In
        </button>
    </header>

    <!-- Hero Section -->
    <section class="hero-section">
        <div
            class="hero-parallax"
            style="
                opacity: {heroOpacity};
                transform: scale({heroScale}) translateY({heroY}px);
            ">
            <FloatingShapes />
            <MorphingBlob
                class="blob-top-right"
                color1="hsl(330, 100%, 85%)"
                color2="hsl(280, 60%, 80%)"
                size={600} />
            <MorphingBlob
                class="blob-bottom-left"
                color1="hsl(197, 50%, 80%)"
                color2="hsl(160, 50%, 75%)"
                size={500} />

            <div class="hero-content">
                <h1 class="hero-title">
                    <span class="title-line"
                        ><span>Course planning,</span></span>
                    <span class="title-line"><span>reimagined.</span></span>
                </h1>
                <p class="hero-subtitle">
                    The modern way to explore, plan, and organize your Princeton
                    schedule.
                </p>
                <div class="hero-cta">
                    <button
                        class="cta-primary"
                        onclick={() => handleLogin(data.supabase)}>
                        <span>Get Started</span>
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>

        <div class="scroll-hint" style="opacity: {1 - scrollProgress * 3}">
            <span>Scroll to explore</span>
            <div class="scroll-line"></div>
        </div>
    </section>

    <!-- Features Section - Flowing layout with scroll animations -->
    <section class="features-section">
        <!-- Feature 1: Explore -->
        <div
            class="feature-block"
            style="
                opacity: {feature1Progress};
                transform: translateY({(1 - feature1Progress) * 60}px);
            ">
            <div class="feature-inner">
                <div class="feature-visual">
                    <div class="visual-grid">
                        {#each Array(12) as _, i}
                            <div
                                class="grid-item"
                                style="
                                    --delay: {i * 50}ms;
                                    --hue: {(i * 30) % 360};
                                    transform: translateY({(1 -
                                    feature1Progress) *
                                    (20 + i * 5)}px) rotate({feature1Progress *
                                    5}deg);
                                ">
                            </div>
                        {/each}
                    </div>
                </div>
                <div class="feature-text">
                    <span class="feature-label">Explore</span>
                    <p class="feature-description">
                        Lightning-fast search across every course. Filter by
                        distribution, level, days, and ratings.
                    </p>
                </div>
            </div>
        </div>

        <!-- Feature 2: Plan -->
        <div
            class="feature-block alt"
            style="
                opacity: {feature2Progress};
                transform: translateY({(1 - feature2Progress) * 60}px);
            ">
            <div class="feature-inner reverse">
                <div class="feature-visual">
                    <div
                        class="calendar-container"
                        style="transform: perspective(1000px) rotateY({(feature2Progress -
                            0.5) *
                            10}deg)">
                        <Calendar3D {mouseX} {mouseY} />
                    </div>
                </div>
                <div class="feature-text">
                    <span class="feature-label">Plan</span>
                    <p class="feature-description">
                        Build your perfect schedule visually. Automatic conflict
                        detection keeps you on track.
                    </p>
                </div>
            </div>
        </div>

        <!-- Feature 3: Export -->
        <div
            class="feature-block"
            style="
                opacity: {feature3Progress};
                transform: translateY({(1 - feature3Progress) * 60}px);
            ">
            <div class="feature-inner">
                <div class="feature-visual">
                    <div class="export-visual">
                        <div
                            class="export-icon"
                            style="transform: scale({0.8 +
                                feature3Progress * 0.2})">
                            <svg
                                width="80"
                                height="80"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1.5">
                                <path d="M12 5v14M5 12l7 7 7-7" />
                                <rect
                                    x="3"
                                    y="19"
                                    width="18"
                                    height="2"
                                    rx="1"
                                    fill="currentColor"
                                    stroke="none" />
                            </svg>
                        </div>
                        <div class="export-rings">
                            {#each [0, 1, 2] as ring}
                                <div
                                    class="ring"
                                    style="
                                        animation-delay: {ring * 0.3}s;
                                        opacity: {feature3Progress};
                                    ">
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>
                <div class="feature-text">
                    <span class="feature-label">Export</span>
                    <p class="feature-description">
                        Sync to Google Calendar or iCal. Your schedule,
                        everywhere you need it.
                    </p>
                </div>
            </div>
        </div>
    </section>

    <!-- CTA Section -->
    <section
        class="cta-section"
        style="
            opacity: {ctaProgress};
            transform: translateY({(1 - ctaProgress) * 40}px);
        ">
        <div class="cta-content">
            <h2 class="cta-title">Ready to plan smarter?</h2>
            <button
                class="cta-final"
                onclick={() => handleLogin(data.supabase)}>
                <span>Start Planning</span>
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
            </button>
        </div>
    </section>

    <LandingFooter />
</div>

<style lang="postcss">
    .landing-page {
        background: white;
        min-height: 100vh;
        overflow-x: hidden;
    }

    /* Fixed header */
    .fixed-header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 100;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 24px 40px;
        pointer-events: none;
        background: linear-gradient(to bottom, white 0%, transparent 100%);
    }

    .fixed-header > * {
        pointer-events: auto;
    }

    .logo {
        display: flex;
        align-items: center;
        gap: 12px;
        text-decoration: none;
        color: black;
    }

    .logo-img {
        width: 40px;
        height: 40px;
    }

    .logo-text {
        font-family: "Inter", sans-serif;
        font-size: 1.1rem;
        font-weight: 600;
    }

    .login-link {
        font-family: "Inter", sans-serif;
        font-size: 0.9rem;
        font-weight: 500;
        color: black;
        background: none;
        border: none;
        cursor: pointer;
        padding: 8px 0;
        position: relative;
    }

    .login-link::after {
        content: "";
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 1px;
        background: black;
        transform: scaleX(0);
        transition: transform 0.3s ease;
    }

    .login-link:hover::after {
        transform: scaleX(1);
    }

    /* Hero Section */
    .hero-section {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        padding: 0 40px;
    }

    .hero-parallax {
        position: relative;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        will-change: transform, opacity;
    }

    :global(.blob-top-right) {
        top: -150px;
        right: -150px;
    }

    :global(.blob-bottom-left) {
        bottom: -100px;
        left: -150px;
    }

    .hero-content {
        position: relative;
        z-index: 10;
        text-align: center;
        max-width: 800px;
    }

    .hero-title {
        font-family: "Playfair Display", serif;
        font-size: clamp(3rem, 8vw, 6rem);
        font-weight: 700;
        line-height: 1.1;
        margin-bottom: 24px;
    }

    .title-line {
        display: block;
        overflow: hidden;
    }

    .title-line span {
        display: inline-block;
    }

    .hero-subtitle {
        font-family: "Inter", sans-serif;
        font-size: clamp(1rem, 2vw, 1.25rem);
        color: #666;
        margin-bottom: 40px;
    }

    .hero-cta {
        display: flex;
        justify-content: center;
    }

    .cta-primary {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        font-family: "Inter", sans-serif;
        font-size: 1.1rem;
        font-weight: 500;
        color: #6485fd;
        background: none;
        border: none;
        cursor: pointer;
        padding: 12px 0;
        transition: gap 0.3s ease;
    }

    .cta-primary:hover {
        gap: 20px;
    }

    .cta-primary:hover svg {
        transform: translateX(4px);
    }

    .cta-primary svg {
        transition: transform 0.3s ease;
    }

    .scroll-hint {
        position: absolute;
        bottom: 40px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        will-change: opacity;
    }

    .scroll-hint span {
        font-family: "Inter", sans-serif;
        font-size: 0.75rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: #999;
    }

    .scroll-line {
        width: 1px;
        height: 40px;
        background: linear-gradient(to bottom, #999, transparent);
        animation: scroll-pulse 2s ease-in-out infinite;
    }

    @keyframes scroll-pulse {
        0%,
        100% {
            opacity: 1;
            transform: scaleY(1);
        }
        50% {
            opacity: 0.5;
            transform: scaleY(0.6);
        }
    }

    /* Features Section */
    .features-section {
        padding: 100px 40px;
        display: flex;
        flex-direction: column;
        gap: 120px;
        max-width: 1100px;
        margin: 0 auto;
    }

    .feature-block {
        will-change: transform, opacity;
    }

    .feature-inner {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 60px;
        align-items: center;
    }

    .feature-inner.reverse {
        direction: rtl;
    }

    .feature-inner.reverse > * {
        direction: ltr;
    }

    .feature-visual {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .feature-text {
        max-width: 400px;
    }

    .feature-label {
        font-family: "Playfair Display", serif;
        font-size: clamp(2rem, 4vw, 3rem);
        font-weight: 700;
        display: block;
        margin-bottom: 16px;
    }

    .feature-description {
        font-family: "Inter", sans-serif;
        font-size: 1.1rem;
        color: #666;
        line-height: 1.7;
    }

    /* Visual Grid */
    .visual-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
    }

    .grid-item {
        width: 50px;
        height: 50px;
        border-radius: 12px;
        background: hsl(var(--hue), 70%, 80%);
        will-change: transform;
    }

    /* Calendar container */
    .calendar-container {
        will-change: transform;
    }

    /* Export visual */
    .export-visual {
        position: relative;
        width: 200px;
        height: 200px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .export-icon {
        color: #6485fd;
        z-index: 1;
    }

    .export-rings {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .ring {
        position: absolute;
        border: 2px solid #6485fd;
        border-radius: 50%;
        animation: ring-pulse 2s ease-out infinite;
    }

    .ring:nth-child(1) {
        width: 100px;
        height: 100px;
    }
    .ring:nth-child(2) {
        width: 140px;
        height: 140px;
    }
    .ring:nth-child(3) {
        width: 180px;
        height: 180px;
    }

    @keyframes ring-pulse {
        0% {
            transform: scale(0.8);
            opacity: 0.8;
        }
        100% {
            transform: scale(1.2);
            opacity: 0;
        }
    }

    /* CTA Section */
    .cta-section {
        padding: 120px 40px;
        text-align: center;
        background: linear-gradient(135deg, #6485fd 0%, #f245c1 100%);
        will-change: transform, opacity;
    }

    .cta-content {
        max-width: 600px;
        margin: 0 auto;
    }

    .cta-title {
        font-family: "Playfair Display", serif;
        font-size: clamp(2rem, 5vw, 3.5rem);
        font-weight: 700;
        color: white;
        margin-bottom: 32px;
    }

    .cta-final {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        font-family: "Inter", sans-serif;
        font-size: 1.1rem;
        font-weight: 500;
        color: white;
        background: transparent;
        border: 2px solid white;
        border-radius: 50px;
        padding: 16px 32px;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .cta-final:hover {
        background: white;
        color: #6485fd;
        gap: 20px;
    }

    /* Responsive */
    @media (max-width: 800px) {
        .feature-inner {
            grid-template-columns: 1fr;
            gap: 40px;
            text-align: center;
        }

        .feature-inner.reverse {
            direction: ltr;
        }

        .feature-text {
            max-width: 100%;
        }

        .features-section {
            padding: 80px 24px;
            gap: 80px;
        }

        .fixed-header {
            padding: 16px 20px;
        }
    }

    @media (max-width: 640px) {
        .logo-text {
            display: none;
        }

        .hero-section {
            padding: 0 24px;
        }
    }
</style>
