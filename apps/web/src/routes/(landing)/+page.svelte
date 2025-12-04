<script lang="ts">
    import { handleLogin } from "$lib/scripts/supabase";

    let { data } = $props();

    let cursorX = $state(0);
    let cursorY = $state(0);
    let cursorVisible = $state(false);

    function handleMouseMove(e: MouseEvent) {
        cursorX = e.clientX;
        cursorY = e.clientY;
    }
</script>

<svg style="position: absolute; width: 0; height: 0;">
    <defs>
        <filter id="landingNoise">
            <feTurbulence
                type="fractalNoise"
                baseFrequency="1.5"
                numOctaves="6"
                stitchTiles="stitch"></feTurbulence>
            <feColorMatrix type="saturate" values="0"></feColorMatrix>
            <feComponentTransfer>
                <feFuncA type="discrete" tableValues="0 0 0 1 1"></feFuncA>
            </feComponentTransfer>
        </filter>
    </defs>
</svg>

<!-- Custom cursor - single colored dot -->
<div
    class="custom-cursor"
    class:visible={cursorVisible}
    style="left: {cursorX}px; top: {cursorY}px;">
</div>

<div
    class="landing h-screen overflow-hidden bg-white flex flex-col justify-between p-6 md:p-10"
    onmouseenter={() => (cursorVisible = true)}
    onmouseleave={() => (cursorVisible = false)}
    onmousemove={handleMouseMove}
    role="presentation">
    <header class="flex justify-between items-start">
        <span class="text-[10px] tracking-[0.3em] uppercase text-zinc-400">
            Est. 2023
        </span>
        <button
            onclick={() => handleLogin(data.supabase)}
            class="px-6 py-3 bg-black text-white text-xs tracking-[0.2em] uppercase
                   hover:bg-accent transition-colors">
            Sign In
        </button>
    </header>

    <main class="flex-1 flex items-end pb-16 md:pb-24">
        <div>
            <h1
                class="font-['Playfair_Display'] text-[clamp(4rem,18vw,14rem)] font-black leading-[0.8] tracking-[-0.02em]">
                <span class="text-primary">Tiger</span><br />
                <span class="text-accent italic">Junction</span>
            </h1>

            <p class="mt-12 text-zinc-500 text-lg">
                Princeton's premier academic planning application
            </p>

            <button
                onclick={() => handleLogin(data.supabase)}
                class="mt-10 group flex items-center gap-3 text-sm text-zinc-600
                       hover:text-black transition-colors">
                <span
                    class="w-12 h-[1px] bg-zinc-300 group-hover:w-20 group-hover:bg-black transition-all"
                ></span>
                <span class="tracking-[0.15em] uppercase">Get Started</span>
            </button>
        </div>
    </main>

    <footer class="flex justify-between items-end">
        <div class="flex gap-2">
            <span class="w-3 h-3 rounded-full bg-primary"></span>
            <span class="w-3 h-3 rounded-full bg-accent"></span>
            <span class="w-3 h-3 rounded-full bg-tertiary"></span>
            <span class="w-3 h-3 rounded-full bg-std-pink"></span>
            <span class="w-3 h-3 rounded-full bg-std-green"></span>
        </div>
        <a
            href="https://tigerapps.org"
            target="_blank"
            rel="noopener noreferrer"
            class="text-[10px] tracking-[0.3em] uppercase text-zinc-400 hover:text-black transition-colors">
            Princeton TigerApps
        </a>
    </footer>
</div>

<style lang="postcss">
    /* Custom cursor - simple colored dot */
    .custom-cursor {
        position: fixed;
        pointer-events: none;
        z-index: 9999;
        width: 10px;
        height: 10px;
        background: #6485fd;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        opacity: 0;
        transition:
            opacity 0.2s ease,
            transform 0.1s ease;
    }

    .custom-cursor.visible {
        opacity: 1;
    }

    .landing {
        position: relative;
        isolation: isolate;
        cursor: none;
    }

    .landing button,
    .landing a {
        cursor: none;
    }

    /* Gradient blobs */
    .landing::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background:
            radial-gradient(
                ellipse at 5% 15%,
                rgba(100, 133, 253, 0.25) 0%,
                transparent 40%
            ),
            radial-gradient(
                ellipse at 95% 85%,
                rgba(255, 159, 0, 0.2) 0%,
                transparent 40%
            ),
            radial-gradient(
                ellipse at 60% 40%,
                rgba(138, 101, 231, 0.15) 0%,
                transparent 45%
            ),
            radial-gradient(
                ellipse at 30% 70%,
                rgba(218, 253, 129, 0.12) 0%,
                transparent 35%
            );
        pointer-events: none;
        z-index: -2;
    }

    /* Noise texture */
    .landing::after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        filter: url(#landingNoise);
        opacity: 0.4;
        pointer-events: none;
        z-index: -1;
    }
</style>
