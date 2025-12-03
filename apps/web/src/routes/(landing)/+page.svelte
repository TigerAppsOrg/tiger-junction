<script lang="ts">
    import { handleLogin } from "$lib/scripts/supabase.js";
    import LandingFooter from "./LandingFooter.svelte";
    import LandingHeader from "./LandingHeader.svelte";

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

    export let data;
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

<section class="bg-white w-screen flex" id="main">
    <div class="overlay flex-1 pt-4 flex flex-col items-center">
        <LandingHeader supabase={data.supabase} />

        <div class="max-w-7xl w-full px-4 sm:px-6 lg:px-8 mt-24">
            <div class="text-center">
                <h1
                    class="py-2 max-w-4xl text-4xl sm:text-6xl
                font-extrabold uppercase mx-auto">
                    <span class="text-pink-500"> Next </span>
                    <span class="text-indigo-500"> Generation </span>
                    <span class="text-blue-500"> Course </span>
                    <span class="text-purple-500"> Planning </span>
                </h1>
                <p
                    class="mt-2 max-w-2xl text-lg sm:text-xl lg:text-2xl
                 text-zinc-600 mx-auto">
                    Princeton's premier academic planning platform. Explore
                    courses, plan your schedule, and succeed.
                </p>
            </div>

            <div
                class="flex gap-4 mt-6 justify-center items-center
            text-sm sm:text-base">
                <!-- <div class="flex justify-start lg:justify-center">
                    <a
                        href={EMAIL_LIST_FORM_LINK}
                        target="_blank"
                        class="blankbutton">
                        Join Email List
                    </a>
                </div> -->
                <div class="flex justify-start lg:justify-center">
                    <button
                        on:click={() => handleLogin(data.supabase)}
                        class="bg-indigo-600 hover:bg-indigo-500 text-white
                    text-center py-2 px-12 rounded-lg font-bold
                     duration-100
                    ">
                        Get Started
                    </button>
                </div>
                <!-- <div class="flex justify-start lg:justify-center">
                    <a href="about" class="blankbutton">
                        Learn More
                    </a>
                </div> -->
            </div>
        </div>

        <div
            class="max-w-4xl w-11/12 mt-12 rounded-xl overflow-hidden
            shadow-2xl glassy">
            <img
                src="/recalplusscreenshot.png"
                alt="Screenshot of the app"
                class="w-full h-full
                object-cover object-center rounded-xl
                " />
        </div>
        <div class="flex-1"></div>

        <!-- <LandingFooter /> -->
    </div>
</section>

<section id="about" class="bg-indigo-50 py-32">
    <div class="max-w-7xl p-4 mx-auto h-full">
        <h2 class="text-4xl font-semibold text-zinc-800 text-center mb-8">
            How it Works
        </h2>
        <div>
            <div class="flex flex-col md:flex-row gap-4">
                <div id="explore" class="flex-1 rounded-3xl">
                    <div class="p-6 space-y-2 bg-white/70 rounded-3xl h-full">
                        <h4>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="currentColor"
                                class="w-8 h-8">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                            </svg>
                        </h4>
                        <h3 class="text-2xl font-semibold text-zinc-800">
                            Explore
                        </h3>
                        <p class="text-zinc-800 text-lg">
                            Browse through the lightning-fast course search to
                            find the perfect courses for your schedule. Use
                            built-in ratings to make informed decisions, and
                            powerful filters to narrow down your search.
                        </p>
                    </div>
                </div>
                <div id="plan" class="flex-1 rounded-3xl">
                    <div class="p-6 space-y-2 bg-white/70 rounded-3xl h-full">
                        <h4>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="currentColor"
                                class="w-8 h-8">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                            </svg>
                        </h4>
                        <h3 class="text-2xl font-semibold text-zinc-800">
                            Plan
                        </h3>
                        <p class="text-zinc-800 text-lg">
                            Add courses to your schedule to visualize your
                            semester. Use the conflict avoidance feature to
                            ensure you never double-book yourself.
                        </p>
                    </div>
                </div>
                <div id="export" class="flex-1 rounded-3xl">
                    <div class="p-6 space-y-2 bg-white/70 rounded-3xl h-full">
                        <h4>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="currentColor"
                                class="w-8 h-8">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                            </svg>
                        </h4>
                        <h3 class="text-2xl font-semibold text-zinc-800">
                            Export
                        </h3>
                        <p class="text-zinc-800 text-lg">
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
    <div class="w-full h-full p-4 py-12 bg-white/40">
        <div class="max-w-7xl p-4 mx-auto h-full">
            <div class="text-center">
                <h2 class="text-4xl font-semibold text-zinc-800">
                    Features Students Love
                </h2>
                <p class="text-zinc-800 text-lg mt-2">
                    Developed in collaboration with the student body,
                    TigerJunction contains the features that students wanted to
                    see.
                </p>
            </div>

            <div
                id="feature-grid"
                class="flex md:flex-row flex-col-reverse w-full gap-4 md:gap-8 mt-12">
                <div
                    class="rounded-3xl bg-white p-4 flex flex-col
                    justify-between md:w-80 w-full h-72">
                    <button
                        on:click={() => (currentFeature = "conflict")}
                        class="feature-select
                        {currentFeature === 'conflict'
                            ? 'bg-gradient-to-br from-emerald-100 to-emerald-200'
                            : 'hover:bg-zinc-100'}
                        ">
                        Conflict Avoidance
                    </button>
                    <button
                        on:click={() => (currentFeature = "search")}
                        class="feature-select
                        {currentFeature === 'search'
                            ? 'bg-gradient-to-br from-fuchsia-100 to-fuchsia-200'
                            : 'hover:bg-zinc-100'}
                    ">
                        Advanced Search
                    </button>
                    <button
                        on:click={() => (currentFeature = "themes")}
                        class="feature-select
                        {currentFeature === 'themes'
                            ? 'bg-gradient-to-br from-violet-100 to-violet-200'
                            : 'hover:bg-zinc-100'}
                    ">
                        Beautiful Themes
                    </button>
                    <button
                        on:click={() => (currentFeature = "ratings")}
                        class="feature-select
                        {currentFeature === 'ratings'
                            ? 'bg-gradient-to-br from-sky-100 to-sky-200'
                            : 'hover:bg-zinc-100'}
                    ">
                        Integrated Ratings
                    </button>
                    <button
                        on:click={() => (currentFeature = "events")}
                        class="feature-select
                            {currentFeature === 'events'
                            ? 'bg-gradient-to-br from-teal-100 to-teal-200'
                            : 'hover:bg-zinc-100'}
                        ">
                        Custom Events
                    </button>
                </div>
                <div class="rounded-3xl p-4 bg-white flex-1 flex gap-4 h-72">
                    <div class="w-1/3">
                        <h3 class="text-2xl font-semibold text-zinc-800">
                            {FEATURE_MAP[currentFeature].title}
                        </h3>
                        <p class="text-zinc-800 mt-1">
                            {FEATURE_MAP[currentFeature].description}
                        </p>
                    </div>
                    <div class="flex-1">
                        <img
                            src={`/feature/${currentFeature}.png`}
                            alt="Feature screenshot"
                            class="w-full h-full object-contain object-center rounded-lg" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<section id="contact" class="bg-indigo-50 py-12 px-4">
    <div id="cool-grad" class="rounded-3xl max-w-7xl mx-auto px-8 py-12">
        <div class="mx-auto flex flex-col items-center gap-4">
            <h2 class="text-3xl font-semibold text-zinc-800 text-center">
                Join thousands of students in seamless academic planning.
            </h2>
            <button
                on:click={() => handleLogin(data.supabase)}
                class="bg-indigo-600 hover:bg-indigo-500 text-white
                text-center py-2 px-8 font-bold
                duration-100 rounded-lg
                ">
                Get Started
            </button>
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
        @apply w-full p-2 rounded-xl border border-zinc-200 text-zinc-800;
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
        background-image:
            radial-gradient(18% 28% at 24% 50%, #ff6b6b00 7%, #ff6b6b00 100%),
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
        @apply bg-gradient-to-b from-white/40 to-indigo-50 from-40%;
    }

    .glassy {
        background-color: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.17);
        @apply p-2 sm:p-6 rounded-3xl;
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
