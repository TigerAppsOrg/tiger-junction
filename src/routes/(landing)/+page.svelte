<script lang="ts">
import { goto } from '$app/navigation';
import { EMAIL_LIST_FORM_LINK } from '$lib/constants';

export let data;

const handleLogin = async () => { 

    if ((await data.supabase.auth.getUser()).data.user) {
        goto("/recalplus");
        return;
    }

    await data.supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: "https://tigerjunction.com/auth/callback"
        }
    });
}
</script>

<svelte:head>
    <title>TigerJunction</title>
    <meta name="description" content="TigerJunction is a platform for effortless course planning at Princeton University. Experience a seamless blend of modern design and integrated features, simplifying your academic journey. Explore, plan, and succeed.">
    <meta property="og:title" content="TigerJunction" />
    <meta property="og:description" content="TigerJunction is a platform for effortless course planning at Princeton University. Experience a seamless blend of modern design and integrated features, simplifying your academic journey. Explore, plan, and succeed." />
    <meta property="og:image" content="https://tigerjunction.com/tjlogo.png" />
    <meta property="og:url" content="https://tigerjunction.com/" />
</svelte:head>

<nav class="flex justify-between items-center text-xl h-20 std-padding">
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

<main class="grid h-[70vh] py-20 std-padding">
    <div class="my-auto h-[60vh]">
        <p class="text-xl mb-2 font-bold">
            TigerJunction
        </p>
        <h1 class="text-5xl font-bold mb-6">
            <span class="text-std-darkBlue">NEXT</span>
            <span class="text-std-darkOrange">GENERATION</span>
            <span class="text-std-darkPink">COURSE</span>
            <span class="text-std-darkPurple">PLANNING</span>
        </h1>
        <p class="mb-6 font-light text-xl">
            Your All-in-One Solution for Effortless Course 
            Planning at Princeton University. Experience a 
            seamless blend of modern design and integrated features, 
            simplifying your academic journey. Explore, plan, and 
            succeed.
        </p>
        <button on:click={handleLogin}
        class="btn btn-green text-xl space-y-0">
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
        <h2 class="text-xl font-light">    
            Effortlessly plan your courses with seamless integration
        </h2>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-3 max-w-6xl gap-6 mx-auto">
        <div class="card bg-std-pink">
            <h1>ReCal+</h1>
            <p class="mb-2">
                Your ultimate semester planning companion, ReCal+
                empowers you to 
                effortlessly design your ideal academic calendar, 
                explore multiple schedules, and pinpoint classes that 
                match your time and requirements with powerful 
                advanced search capabilities, all while ensuring 
                your classes never clash with custom blocks for 
                non-course events. Stay updated with notifications 
                for class slot openings, while the customizable 
                interface simplifies academic scheduling. 
            </p>
            <p class="italic">
                Inspired by 
                <a href="https://recal.io/" target="_blank" class="link">
                    ReCal</a>.
            </p>
        </div>

        <div class="card bg-std-blue">
            <h1>CourseGenie (Coming Soon)</h1>
            <p class="mb-2">
                With CourseGenie, you can embark on an enriched 
                academic journey. Seamlessly chart all four years, 
                matching your aspirations with major, minor, and 
                certificate requirements, presented in clear 
                and comprehensive layouts. Experience data-driven 
                insights as you explore course ratings, historical
                trends, and other statistics.
                Elevate your choices with an AI-driven course 
                suggestor, ensuring a personalized and successful 
                academic path. 
            </p>
            <p class="italic">
                Inspired by
                <a href="https://www.tigerpath.io/" target="_blank" class="link">
                    TigerPath</a>, 
                <a href="https://www.princetoncourses.com/" target="_blank" class="link">
                    PrincetonCourses</a>, and 
                <a href="https://tigersnatch.com/" target="_blank" class="link">
                    TigerSnatch</a>.
            </p>
        </div>

        <div class="card bg-std-orange">
            <h1>ReqTree (Coming Soon)</h1>
            <p class="mb-2">
                A visually dynamic app that transforms prerequisites 
                into technology trees
                (found in games like Civilization), 
                ReqTree visually maps out the intricate relationships 
                between class prerequisites, allowing you to navigate 
                through your academic journey with clarity and foresight. 
                Through its intuitive interface, you can easily 
                explore the progression of course requirements, 
                revealing a comprehensive view of the academic 
                landscape and enabling you to make informed 
                decisions about your path. 
            </p>
            <p class="italic">
                Inspired by 
                <a href="https://tigermap.tigerapps.org/" target=_blank class="link">
                TigerMap</a>.
            </p>
        </div>
    </div>
    
    <div class="mt-16">
        <div class="bg-std-darkGray text-white p-8 rounded-lg shadow-lg
        text-xl flex justify-between items-center gap-6">
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

<footer class="bg-black dark:bg-white text-center text-white 
dark:text-black text-sm font-light py-4">
    Made with 
    <a href="https://svelte.dev/" target="_blank" class="underline
    duration-150 hover:text-gray-200">
        Svelte
    </a> 
    by @motoaki
</footer>

<style lang="postcss">
.card {
    @apply p-8 rounded-lg shadow-lg;
}

.card h1 {
    @apply font-bold text-2xl mb-2;
}

.card p {
    @apply text-xl font-light;
}

.btn {
    @apply rounded-md px-4 py-2 shadow-md hover:shadow-lg;
}

.std-padding {
    @apply px-4 sm:px-20;
}

.btn-green {
    @apply bg-std-green text-black
    hover:bg-std-darkGreen duration-150;
}

.link {
    @apply underline hover:text-gray-600 duration-150;
}
</style>