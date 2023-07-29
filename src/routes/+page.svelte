<script lang="ts">
    import { goto } from '$app/navigation';
    import ViewCard from '$lib/components/elements/ViewCard.svelte';
    import { darkTheme } from '$lib/stores/state.js';

    import CalendarPic from "$lib/img/calendar.png";
    import TreePic from "$lib/img/tree.png";
    import CertificatePic from "$lib/img/certificate.png";
    import RoadPic from "$lib/img/road.png";

    export let data;

    $: dark = $darkTheme;

    const handleLogin = async () => { 

        if ((await data.supabase.auth.getUser()).data.user) {
            goto("/home");
            return;
        }

        await data.supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: "http://localhost:5173/auth/callback"
            }
        });
    }
</script>

<div class:dark>
<div class="h-screen area">
    <nav class="flex justify-between items-center text-xl h-[10vh]">
        <div id="left">
            <a href="/" class="flex items-center">
                <img src="tjlogolarge.png" alt="Tiger Junction logo"
                class="w-16 h-16">
                <span>TigerJunction</span>
            </a>
        </div>
        <div id="right" class="space-x-6">
            <a href="#about" class="hover:text-gray-500 duration-150">
                About
            </a>
            <button class="btn-cool"
            on:click={handleLogin}>
                Login
            </button>
        </div>
    </nav>
    <main class="grid grid-cols-2 h-[70vh] py-20">
        <div class="my-auto h-[60vh]">
            <p class="text-xl mb-2 font-bold">
                TigerJunction
            </p>
            <h1 class="text-5xl font-bold glow mb-6">
                <span class="rainbow">NEXT GENERATION</span> 
                COURSE PLANNING
            </h1>
            <p class="mb-6 font-light text-xl">
                Lorem, ipsum dolor sit amet consectetur adipisicing elit. Voluptatibus excepturi itaque dolore iusto, id tenetur blanditiis eveniet amet possimus illo architecto natus velit ab aperiam consequuntur, corrupti, in assumenda dignissimos!
            </p>
            <button on:click={handleLogin}
            class="btn-cool text-xl">
                Get Started →
            </button>
        </div>
        <div class="flex justify-end">
            <img src={RoadPic} alt="3d road sign model"
            class="max-h-[70vh] w-auto">
        </div>
    </main>
</div>
<div id="about" class="py-20 area">
    <div class="text-center mb-6">
        <h1 class="text-5xl font-bold glow mb-2">
            Three apps, <span class="rainbow">one platform</span>
        </h1>
        <h2 class="text-xl font-light">    
            Integrated to seamlessly plan your courses
        </h2>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-3 max-w-6xl gap-6 mx-auto">
        <ViewCard 
        className="bg-gradient-to-br from-[#6157FF] to-[#EE49FD] text-white">
            <img slot="image" src={CalendarPic} alt="Calendar 3d model">
            <span slot="title">ReCal+</span>
            <span slot="description">
                Inspired by 
                <a href="https://recal.io/" target="_blank" class="link">
                    ReCal</a>.
            </span>
        </ViewCard>
        <ViewCard 
        className="bg-gradient-to-br from-[#103CE7] to-[#64E9FF] text-white">
            <img slot="image" src={CertificatePic} alt="Certificate 3d model">
            <span slot="title">CourseGenie</span>
            <span slot="description">
                Inspired by
                <a href="https://www.tigerpath.io/" target="_blank" class="link">
                    TigerPath</a>.
            </span>
        </ViewCard>
        <ViewCard 
        className="bg-gradient-to-br from-[#0172AF] to-[#74FEBD] text-white">
            <img slot="image" src={TreePic} alt="Tree 3d model">
            <span slot="title">ReqTree</span>
            <span slot="description">
                
                Inspired by 
                <a href="https://tigermap.tigerapps.org/" target=_blank class="link">
                TigerMap</a>.
            </span>
        </ViewCard>
    </div>
</div>
<footer class="bg-black dark:bg-white text-center text-white dark:text-black text-sm font-light
py-4">
    Made with 
    <a href="https://svelte.dev/" target="_blank" class="link">
        Svelte
    </a> 
    by @joshuamotoaki.
    <a href="https://www.vecteezy.com/free-png/3d" target="_blank" class="link">
        3d PNGs by Vecteezy
    </a>
</footer>
</div>

<style lang="postcss">
    .rainbow {
        @apply bg-gradient-to-r from-blue-500 to-purple-500;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }

    .glow {
        text-shadow: 0 0 80px rgb(192 219 255 / 75%), 0 0 32px rgb(65 120 255 / 24%);
    }

    .btn-cool:hover {
        @apply shadow-lg duration-150;
    }

    .btn-cool {
        @apply bg-gradient-to-r from-blue-500 to-purple-500
        text-white rounded-full px-4 py-2;
    }

    .area {
        @apply bg-white dark:bg-black dark:text-white text-black px-20 w-screen;
    }

    .link {
        @apply underline hover:text-gray-200 duration-150;
    }
</style>