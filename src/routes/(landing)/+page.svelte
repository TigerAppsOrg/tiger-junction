<script lang="ts">
    import { EMAIL_LIST_FORM_LINK } from "$lib/constants";
    import { handleLogin } from "$lib/scripts/supabase.js";
    import LandingFooter from "./LandingFooter.svelte";
    import LandingHeader from "./LandingHeader.svelte";

    let currentFeature = "advanced-search";

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

<section class="bg-white min-h-screen w-screen flex" id="main">
    <div class="overlay flex-1 pt-4 flex flex-col items-center">
        <LandingHeader supabase={data.supabase} />

        <div class="max-w-7xl w-full px-4 sm:px-6 lg:px-8 mt-24">
            <div class="lg:text-center">
                <h1
                    class="py-2 max-w-4xl text-4xl sm:text-6xl
                font-extrabold uppercase
                lg:mx-auto">
                    <span class="text-pink-500"> Next </span>
                    <span class="text-indigo-500"> Generation </span>
                    <span class="text-blue-500"> Course </span>
                    <span class="text-purple-500"> Planning </span>
                </h1>
                <p
                    class="mt-2 max-w-2xl text-lg sm:text-xl
                lg:text-2xl
                 text-zinc-700 lg:mx-auto">
                    Princeton's premier academic planning platform. Explore
                    courses, plan your schedule, and succeed.
                </p>
            </div>

            <div
                class="flex gap-4 mt-6 lg:justify-center items-center
            text-sm sm:text-base">
                <div class="flex justify-start lg:justify-center">
                    <a
                        href={EMAIL_LIST_FORM_LINK}
                        target="_blank"
                        class="blankbutton">
                        Join Email List
                    </a>
                </div>
                <div class="flex justify-start lg:justify-center">
                    <button
                        on:click={() => handleLogin(data.supabase)}
                        class="bg-indigo-600 hover:bg-indigo-500 text-white
                    text-center py-2 px-4 rounded-lg font-bold
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

        <div class="flex-1"></div>

        <!-- <LandingFooter /> -->
    </div>
</section>

<section id="about" class="h-screen bg-indigo-50"></section>

<section id="features" class="bg-blue-200">
    <div class="w-full h-full p-4 py-12 bg-white/40">
        <div class="max-w-7xl p-4 mx-auto h-full">
            <div class="text-center">
                <h2 class="text-4xl font-semibold text-zinc-800">
                    Features Students Love
                </h2>
                <p class="text-zinc-700 text-lg mt-2">
                    Developed in collaboration with the student body,
                    TigerJunction contains the features that students wanted to
                    see.
                </p>
            </div>

            <div id="feature-grid" class="flex w-full gap-8 mt-12">
                <div
                    class="rounded-3xl bg-white p-4 flex flex-col gap-2
                 w-80">
                    <button
                        on:click={() => (currentFeature = "conflict-avoidance")}
                        class="feature-select
                        {currentFeature === 'conflict-avoidance'
                            ? 'bg-red-200'
                            : 'hover:bg-zinc-100'}
                        ">
                        Conflict Avoidance
                    </button>
                    <button
                        on:click={() => (currentFeature = "advanced-search")}
                        class="feature-select
                        {currentFeature === 'advanced-search'
                            ? 'bg-orange-200'
                            : 'hover:bg-zinc-100'}
                    ">
                        Advanced Search
                    </button>
                    <button
                        on:click={() => (currentFeature = "custom-theme")}
                        class="feature-select
                        {currentFeature === 'custom-theme'
                            ? 'bg-yellow-200'
                            : 'hover:bg-zinc-100'}
                    ">
                        Custom Theme
                    </button>
                    <button
                        on:click={() => (currentFeature = "integrated-ratings")}
                        class="feature-select
                        {currentFeature === 'integrated-ratings'
                            ? 'bg-green-200'
                            : 'hover:bg-zinc-100'}
                    ">
                        Integrated Ratings
                    </button>
                    <button
                        on:click={() => (currentFeature = "custom-events")}
                        class="feature-select
                            {currentFeature === 'custom-events'
                            ? 'bg-blue-200'
                            : 'hover:bg-zinc-100'}
                        ">
                        Custom Events
                    </button>
                </div>
                <div class="rounded-3xl p-4 bg-white flex-1">
                    {currentFeature}
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
        background-image: url("/bg/ppbg.jpg");
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
        @apply bg-gradient-to-b from-white/40 to-indigo-50 from-40%;
    }

    .glassy {
        background-color: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        border-radius: 10px;
        padding: 20px;
        margin: 20px;
        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.17);
    }

    .logo {
        @apply w-7 h-7 inline-block object-contain;
    }

    .blankbutton {
        @apply inline-block px-4 py-2 border 
                    text-center
                    rounded-lg text-black border-black hover:text-zinc-600
                    hover:border-zinc-600
                     duration-100;
    }
</style>
