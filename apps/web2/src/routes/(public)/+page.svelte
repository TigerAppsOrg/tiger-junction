<script lang="ts">
    import LandingFooter from "./LandingFooter.svelte";
    import LandingHeader from "./LandingHeader.svelte";
    import { Calendar, Icon, MagnifyingGlass, Share } from "svelte-hero-icons";

    let currentFeature = "conflict";
    const FEATURE_MAP: Record<string, Record<string, string>> = {
        conflict: {
            title: "Conflict Avoidance",
            description:
                "Avoid scheduling conflicts by filtering courses based on your existing schedule."
        },
        search: {
            title: "Advanced Search",
            description:
                "Filter by distribution requirement, level, days, and more to find the perfect courses for your schedule."
        },
        themes: {
            title: "Beautiful Themes",
            description:
                "Customize your experience with a variety of themes, including a 1-click dark mode."
        },
        ratings: {
            title: "Integrated Ratings",
            description: "View course ratings directly within the app."
        },
        events: {
            title: "Custom Events",
            description:
                "Add custom events to your schedule, such as office hours, club meetings, and more. Integrates with conflict avoideance to ensure you never schedule over your activities."
        }
    };
</script>

<svelte:head>
    <title>TigerJunction</title>
    <meta
        name="description"
        content="TigerJunction is a platform for effortless course planning at Princeton University. Experience a seamless blend of modern design and integrated features, simplifying your academic journey. Explore, plan, and succeed." />
    <meta property="og:title" content="TigerJunction" />
    <meta
        property="og:description"
        content="TigerJunction is a platform for effortless course planning at Princeton University. Experience a seamless blend of modern design and integrated features, simplifying your academic journey. Explore, plan, and succeed." />
    <meta
        property="og:image"
        content="https://junction.tigerapps.org/tjlogo.png" />
    <meta property="og:url" content="https://junction.tigerapps.org/" />
</svelte:head>

<section class="flex w-screen bg-white" id="main">
    <div class="overlay flex flex-1 flex-col items-center pt-4">
        <LandingHeader />

        <div class="mt-24 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="text-center">
                <h1
                    class="mx-auto max-w-4xl py-2 text-4xl
                font-extrabold uppercase sm:text-6xl">
                    <span class="text-pink-500"> Next </span>
                    <span class="text-indigo-500"> Generation </span>
                    <span class="text-blue-500"> Course </span>
                    <span class="text-purple-500"> Planning </span>
                </h1>
                <p
                    class="mx-auto mt-2 max-w-2xl text-lg text-zinc-600
                 sm:text-xl lg:text-2xl">
                    Princeton's premier academic planning platform. Explore
                    courses, plan your schedule, and succeed.
                </p>
            </div>

            <div
                class="mt-6 flex items-center justify-center gap-4 text-sm sm:text-base">
                <div class="flex justify-start lg:justify-center">
                    <a href="/recalplus" class="cta-button px-12 py-2">
                        Get Started
                    </a>
                </div>
            </div>
        </div>

        <div
            class="glassy mt-12 w-11/12 max-w-4xl overflow-hidden rounded-xl shadow-2xl">
            <img
                src="/recalplusscreenshot.png"
                alt="Screenshot of the app"
                class="h-full w-full
                rounded-xl object-cover object-center
                " />
        </div>
        <div class="flex-1"></div>
    </div>
</section>

<section id="about" class="bg-indigo-50 py-32">
    <div class="mx-auto h-full max-w-7xl p-4">
        <h2 class="mb-8 text-center text-4xl font-semibold text-zinc-800">
            How it Works
        </h2>
        <div>
            <div class="flex flex-col gap-4 md:flex-row">
                <div id="explore" class="flex-1 rounded-3xl">
                    <div class="h-full space-y-2 rounded-3xl bg-white/70 p-6">
                        <Icon src={MagnifyingGlass} class="size-8" />
                        <h3 class="text-2xl font-semibold text-zinc-800">
                            Explore
                        </h3>
                        <p class="text-lg text-zinc-800">
                            Browse through the lightning-fast course search to
                            find the perfect courses for your schedule. Use
                            built-in ratings to make informed decisions, and
                            powerful filters to narrow down your search.
                        </p>
                    </div>
                </div>
                <div id="plan" class="flex-1 rounded-3xl">
                    <div class="h-full space-y-2 rounded-3xl bg-white/70 p-6">
                        <Icon src={Calendar} class="size-8" />
                        <h3 class="text-2xl font-semibold text-zinc-800">
                            Plan
                        </h3>
                        <p class="text-lg text-zinc-800">
                            Add courses to your schedule to visualize your
                            semester. Use the conflict avoidance feature to
                            ensure you never double-book yourself.
                        </p>
                    </div>
                </div>
                <div id="export" class="flex-1 rounded-3xl">
                    <div class="h-full space-y-2 rounded-3xl bg-white/70 p-6">
                        <Icon src={Share} class="size-8" />
                        <h3 class="text-2xl font-semibold text-zinc-800">
                            Export
                        </h3>
                        <p class="text-lg text-zinc-800">
                            Export your schedule to your favorite calendar app.
                            Any changes you make will be periodically synced.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<section id="features" class="bg-blue-200">
    <div class="h-full w-full bg-white/40 p-4 py-12">
        <div class="mx-auto h-full max-w-7xl p-4">
            <div class="text-center">
                <h2 class="text-4xl font-semibold text-zinc-800">
                    Features Students Love
                </h2>
                <p class="mt-2 text-lg text-zinc-800">
                    Developed in collaboration with the student body,
                    TigerJunction contains the features that students wanted to
                    see.
                </p>
            </div>

            <div
                id="feature-grid"
                class="mt-12 flex w-full flex-col-reverse gap-4 md:flex-row md:gap-8">
                <div
                    class="flex h-72 w-full flex-col justify-between
                    rounded-3xl bg-white p-4 md:w-80">
                    <button
                        onclick={() => (currentFeature = "conflict")}
                        class="feature-select
                        {currentFeature === 'conflict'
                            ? 'bg-gradient-to-br from-emerald-100 to-emerald-200'
                            : 'hover:bg-zinc-100'}
                        ">
                        Conflict Avoidance
                    </button>
                    <button
                        onclick={() => (currentFeature = "search")}
                        class="feature-select
                        {currentFeature === 'search'
                            ? 'bg-gradient-to-br from-fuchsia-100 to-fuchsia-200'
                            : 'hover:bg-zinc-100'}
                    ">
                        Advanced Search
                    </button>
                    <button
                        onclick={() => (currentFeature = "themes")}
                        class="feature-select
                        {currentFeature === 'themes'
                            ? 'bg-gradient-to-br from-violet-100 to-violet-200'
                            : 'hover:bg-zinc-100'}
                    ">
                        Beautiful Themes
                    </button>
                    <button
                        onclick={() => (currentFeature = "ratings")}
                        class="feature-select
                        {currentFeature === 'ratings'
                            ? 'bg-gradient-to-br from-sky-100 to-sky-200'
                            : 'hover:bg-zinc-100'}
                    ">
                        Integrated Ratings
                    </button>
                    <button
                        onclick={() => (currentFeature = "events")}
                        class="feature-select
                            {currentFeature === 'events'
                            ? 'bg-gradient-to-br from-teal-100 to-teal-200'
                            : 'hover:bg-zinc-100'}
                        ">
                        Custom Events
                    </button>
                </div>
                <div class="flex h-72 flex-1 gap-4 rounded-3xl bg-white p-4">
                    <div class="w-1/3">
                        <h3 class="text-2xl font-semibold text-zinc-800">
                            {FEATURE_MAP[currentFeature].title}
                        </h3>
                        <p class="mt-1 text-zinc-800">
                            {FEATURE_MAP[currentFeature].description}
                        </p>
                    </div>
                    <div class="flex-1">
                        <img
                            src={`/feature/${currentFeature}.png`}
                            alt="Feature screenshot"
                            class="h-full w-full rounded-lg object-contain object-center" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<section id="contact" class="bg-indigo-50 px-4 py-12">
    <div id="cool-grad" class="mx-auto max-w-7xl rounded-3xl px-8 py-12">
        <div class="mx-auto flex flex-col items-center gap-4">
            <h2 class="text-center text-3xl font-semibold text-zinc-800">
                Join thousands of students in seamless academic planning.
            </h2>
            <a href="/recalplus" class="cta-button px-8 py-2"> Get Started </a>
        </div>
    </div>
</section>

<LandingFooter />

<style lang="postcss">
    #features {
        background-image: url("/bg/feat.jpg");
        background-size: cover;
        background-position: center;
    }

    .feature-select {
        @apply w-full rounded-xl border border-zinc-200 p-2 text-zinc-800;
    }

    #cool-grad {
        /* Blue to pink to purple  */
        background-image: linear-gradient(
            125deg,
            #aba3ff65 5%,
            rgba(255, 148, 237, 0.395) 50%,
            rgba(197, 89, 255, 0.308) 950%
        );
    }

    #main {
        background-image: radial-gradient(
                18% 28% at 24% 50%,
                #ff6b6b00 7%,
                #ff6b6b00 100%
            ),
            radial-gradient(18% 28% at 18% 71%, #ffffff9c 6%, #ff6b6b00 100%),
            radial-gradient(
                70% 53% at 36% 76%,
                rgb(36, 45, 227) 0%,
                #ff6b6b00 100%
            ),
            radial-gradient(42% 53% at 15% 94%, #ffffffff 7%, #ff6b6b00 100%),
            radial-gradient(42% 53% at 34% 72%, #ffffffff 7%, #ff6b6b00 100%),
            radial-gradient(18% 28% at 35% 87%, #f245c1cc 7%, #ff6b6b00 100%),
            radial-gradient(31% 43% at 7% 98%, #ffffffff 24%, #ff6b6b00 100%),
            radial-gradient(21% 37% at 72% 23%, #ff31eeaa 24%, #ff6b6b00 100%),
            radial-gradient(35% 56% at 91% 74%, #c44effcc 9%, #ff6b6b00 100%),
            radial-gradient(74% 86% at 67% 38%, #4ecdc4ff 24%, #ff6b6b00 100%),
            linear-gradient(125deg, #ff6b6bcc 1%, #ffffffff 100%);
        background-size: 200% 200%;
        animation: gradient 20s ease infinite;
    }

    @keyframes gradient {
        0% {
            background-position: 0% 50%;
        }
        50% {
            background-position: 100% 50%;
        }
        100% {
            background-position: 0% 50%;
        }
    }

    .overlay {
        @apply bg-gradient-to-b from-white/40 from-40% to-indigo-50;
    }

    .glassy {
        background-color: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.17);
        @apply rounded-3xl p-2 sm:p-6;
    }

    #explore {
        background-image: url("/bg/explore.jpg");
        background-size: cover;
    }

    #plan {
        background-image: url("/bg/plan.jpg");
        background-size: cover;
    }

    #export {
        background-image: url("/bg/export.jpg");
        background-size: cover;
    }
</style>
