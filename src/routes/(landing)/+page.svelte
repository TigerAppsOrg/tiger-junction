<script lang="ts">
import { goto } from '$app/navigation';
import { EMAIL_LIST_FORM_LINK } from '$lib/constants';
import githubIcon from "$lib/img/github-mark-white.svg";

export let data;

const handleLogin = async () => { 
    // Redirect if user is already logged in
    const user = (await data.supabase.auth.getSession()).data.session?.user;
    if (user) {
        goto("/recalplus");
        return;
    }

    await data.supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: "https://junction.tigerapps.org/auth/callback"
        }
    });
}
</script>

<svelte:head>
    <title>TigerJunction</title>
    <meta name="description" content="TigerJunction is a platform for effortless course planning at Princeton University. Experience a seamless blend of modern design and integrated features, simplifying your academic journey. Explore, plan, and succeed.">
    <meta property="og:title" content="TigerJunction" />
    <meta property="og:description" content="TigerJunction is a platform for effortless course planning at Princeton University. Experience a seamless blend of modern design and integrated features, simplifying your academic journey. Explore, plan, and succeed." />
    <meta property="og:image" content="https://junction.tigerapps.org/tjlogo.png" />
    <meta property="og:url" content="https://junction.tigerapps.org/" />
</svelte:head>

<nav class="flex justify-between items-center text-lg h-20 std-padding">
    <div id="left">
        <a href="/" class="flex items-center">
            <img src="tjlogolarge.png" alt="Tiger Junction logo"
            class="w-16 h-16">
            <span class="text-std-darkOrange">TigerJunction</span>
        </a>
    </div>
    <div id="right" class="space-x-6">
        <button class="btn btn-green"
        on:click={handleLogin}>
            Login
        </button>
    </div>
</nav>

<main class="grid h-[80vh] sm:h-[65vh] py-20 std-padding">
    <div class="my-auto h-[60vh]">
        <p class="text-lg mb-2 font-bold">
            TigerJunction
        </p>
        <h1 class="text-5xl font-bold mb-4">
            <span class="text-std-darkBlue">NEXT</span>
            <span class="text-std-darkOrange">GENERATION</span>
            <span class="text-std-darkPink">COURSE</span>
            <span class="text-std-darkPurple">PLANNING</span>
        </h1>
        <p class="mb-6 font-light text-lg">
            Your All-in-One Solution for Effortless Course 
            Planning at Princeton University. Experience a 
            seamless blend of modern design and integrated features, 
            simplifying your academic journey. Explore, plan, and 
            succeed.
        </p>
        <button on:click={handleLogin}
        class="btn btn-green text-lg space-y-0">
        <div>
            Get Started →
        </div>
        <div class="font-light text-xs italic">
            Princeton Email Required
        </div>

        </button>
    </div>
</main>
    
<div id="about" class="py-20 std-padding">
    <div class="text-center mb-6">
        <h1 class="text-5xl font-bold mb-2">
            Three apps, <span class="text-std-darkRed">one platform</span>
        </h1>
        <h2 class="text-lg font-light">    
            Effortlessly plan your courses with seamless integration
        </h2>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-3 max-w-6xl gap-6 mx-auto">
        <div class="card bg-std-pink">
            <h1>ReCal+</h1>
            <p class="mb-2">
                Design and export your ideal schedule with powerful advanced
                search and filtering capabilities.
            </p>
        </div>

        <div class="card bg-std-blue">
            <h1>CourseGenie</h1>
            <p class="mb-2">
                Craft your four-year academic journey with all the
                information you need at your fingertips.
            </p>
        </div>

        <div class="card bg-std-orange">
            <h1>Panthera</h1>
            <p class="mb-2">
                Visualize prerequisites and degree requirements with a 
                modern, interactive interface.
            </p>
        </div>
    </div>
    
    <div class="mt-16">
        <div class="bg-zinc-300 p-8 rounded-lg 
        text-lg flex justify-between items-center gap-6">
            <div class="flex items-center gap-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
                class="w-10 h-10 hidden md:block">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>                  
                Join our emailing list to receive updates about
                TigerJunction feature releases and other news!
            </div>
            <a href={EMAIL_LIST_FORM_LINK} target="_blank">
                <button class="btn btn-green">
                    Get Updated
                </button>
            </a>
        </div>
    </div>
    
</div>

<footer class="bg-std-darkPurple text-center text-slate-100 
font-light py-4 text-sm">
    <div>
        <span>
            Made with love with
            <a href="https://svelte.dev/" target="_blank" class="link">
                Svelte</a>,
            <a href="https://supabase.com/" target="_blank" class="link">
                Supabase</a>,
            <a href="https://tailwindcss.com/" target="_blank" class="link">
                TailwindCSS</a>,  
            <a href="https://melt-ui.com/" target="_blank" class="link">
                MeltUI</a>, and  
            <a href="https://pixijs.com/" target="_blank" class="link">
                PixiJS</a>
            by Joshua Lau
        </span>
    </div>
    <div>
        Inspired by <a href="https://recal.io/" target="_blank" class="link">
            ReCal</a>, 
            <a href="https://www.tigerpath.io/" target="_blank" class="link">
                TigerPath</a>,
            <a href="https://www.princetoncourses.com/" target="_blank" class="link">
                PrincetonCourses</a>, and
            <a href="https://tigermap.tigerapps.org/" target="_blank" class="link">
                TigerMap</a>.
    </div>
    <div class="mt-2 flex items-center justify-center gap-2">
        View the source code on
        <a href="https://github.com/TigerAppsOrg/TigerJunction" target="_blank">
            <img src={githubIcon} alt="GitHub icon" class="w-6 h-6 inline-block">
        </a>
    </div>
</footer>

<style lang="postcss">
.card {
    @apply p-8 rounded-lg;
}

.card h1 {
    @apply font-bold text-2xl mb-2;
}

.card p {
    @apply text-lg font-light;
}

.btn {
    @apply rounded-md px-4 py-2;
}

.btn:active {
    @apply transform scale-95;
}

.std-padding {
    @apply px-4 sm:px-20;
}

.btn-green {
    @apply bg-std-green text-black
    hover:bg-std-darkGreen duration-150;
}

.link {
    @apply underline duration-100 hover:text-zinc-300;
}
</style>