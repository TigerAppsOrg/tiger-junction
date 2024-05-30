<script lang="ts">
    import { EMAIL_LIST_FORM_LINK } from '$lib/constants';
    import { handleLogin } from '$lib/supabase.js';
    import LandingFooter from './LandingFooter.svelte';
    import LandingHeader from './LandingHeader.svelte';
    
    export let data;
</script>
    
<svelte:head>
    <title>TigerJunction</title>
    <meta name="description" content="TigerJunction is a platform for effortless course planning at Princeton University. Experience a seamless blend of modern design and integrated features, simplifying your academic journey. Explore, plan, and succeed.">
    <meta property="og:title" content="TigerJunction" />
    <meta property="og:description" content="TigerJunction is a platform for effortless course planning at Princeton University. Experience a seamless blend of modern design and integrated features, simplifying your academic journey. Explore, plan, and succeed." />
    <meta property="og:image" content="https://junction.tigerapps.org/tjlogo.png" />
    <meta property="og:url" content="https://junction.tigerapps.org/" />
</svelte:head>
    

<div class="bg-white min-h-screen w-screen flex" id="main">
    <div class="overlay flex-1 pt-2 flex flex-col items-center">
        
        <LandingHeader supabase={data.supabase} />
    
        <div class="max-w-7xl w-full px-4 sm:px-6 lg:px-8 mt-16">
            <div class="lg:text-center">
                <p class="mt-2 text-lg leading-8 font-bold 
                lg:text-2xl
                tracking-tight text-gray-900 sm:text-xl">
                    TigerJunction
                </p>
                <h1 class="py-2 max-w-2xl text-4xl sm:text-6xl
                font-extrabold uppercase
                lg:mx-auto">
                    <span class="text-pink-500">
                        Next
                    </span>
                    <span class="text-indigo-500">
                        Generation
                    </span>
                    <span class="text-blue-500">
                        Course
                    </span>
                    <span class="text-purple-500">
                        Planning
                    </span>
                </h1>
                <p class="mt-2 max-w-2xl text-lg sm:text-xl
                lg:text-2xl
                 text-gray-500 lg:mx-auto">
                    Princeton's premier academic planning platform. 
                    Explore courses, plan your schedule, and succeed.
                </p>
            </div>
        
            
            <div class="flex gap-4 mt-6 lg:justify-center items-center
            text-sm sm:text-base">
                <div class="flex justify-start lg:justify-center">
                    <button
                    on:click={() => handleLogin(data.supabase)}
                    class="bg-indigo-600 hover:bg-indigo-500 text-white 
                    text-center py-2 px-4 rounded font-bold
                    active:scale-95 duration-100
                    ">
                        Get Started
                    </button>
                </div>
                <div class="flex justify-start lg:justify-center">
                    <a href={EMAIL_LIST_FORM_LINK} target="_blank"
                    class="blankbutton">
                        Join Email List
                    </a>
                </div>
                <!-- <div class="flex justify-start lg:justify-center">
                    <a href="about" class="blankbutton">
                        Learn More
                    </a>
                </div> -->
            </div>
        </div>
        
        <div class="flex-1"></div>
        <div id="poweredby" class="glassy max-w-lg
        w-[90%] mx-auto">
            <div class="text-gray-500 text-center">
                Powered By
            </div>
            <div class="w-full flex items-center
            justify-center gap-4 mt-2">
                <a href="https://svelte.dev/" target="_blank">                
                    <img src="/home/svelte.png" alt="Svelte"
                    class="logo">
                </a>
                <a href="https://www.typescriptlang.org/" target="_blank">                
                    <img src="/home/ts.png" alt="Typescript"
                    class="logo">
                </a>
                <a href="https://supabase.com/" target="_blank">
                    <img src="/home/supabase.png" alt="Supabase"
                    class="logo">
                </a>
                <a href="https://redis.io/" target="_blank">
                    <img src="/home/redis.svg" alt="Redis"
                    class="logo">
                </a>
                <a href="https://www.anthropic.com/" target="_blank">
                    <img src="/home/anthropic.jpeg" alt="Anthropic"
                    class="logo">
                </a>                
                <a href="https://tailwindcss.com/" target="_blank">
                    <img src="/home/tailwind.png" alt="TailwindCSS"
                    class="logo">
                </a>
                <a href="https://melt-ui.com/" target="_blank">
                    <img src="/home/melt.png" alt="MeltUI"
                    class="logo">
                </a>
                <a href="https://sst.dev/" target="_blank">
                    <img src="/home/sst.svg" alt="SST"
                    class="logo">
                </a>
                <a href="https://aws.amazon.com/what-is-cloud-computing" target="_blank">
                    <img src="/home/aws.png" 
                    alt="Powered by AWS Cloud Computing" class="logo">
                </a>
                <a href="https://www.cloudflare.com/" target="_blank">
                    <img src="/home/cloudflare.png" alt="Cloudflare"
                    class="logo">
                </a>
            </div>
        </div>

        <LandingFooter />
    </div>
</div>

<style lang="postcss">
    #main {
        background-image: radial-gradient(18% 28% at 24% 50%, #FF6B6B00 7%, #FF6B6B00 100%),
                  radial-gradient(18% 28% at 18% 71%, #FFFFFF9C 6%, #FF6B6B00 100%),
                  radial-gradient(70% 53% at 36% 76%, #4ECDC4FF 0%, #FF6B6B00 100%),
                  radial-gradient(42% 53% at 15% 94%, #FFFFFFFF 7%, #FF6B6B00 100%),
                  radial-gradient(42% 53% at 34% 72%, #FFFFFFFF 7%, #FF6B6B00 100%),
                  radial-gradient(18% 28% at 35% 87%, #C44EFFCC 7%, #FF6B6B00 100%),
                  radial-gradient(31% 43% at 7% 98%, #FFFFFFFF 24%, #FF6B6B00 100%),
                  radial-gradient(21% 37% at 72% 23%, #FFD93DAA 24%, #FF6B6B00 100%),
                  radial-gradient(35% 56% at 91% 74%, #C44EFFCC 9%, #FF6B6B00 100%),
                  radial-gradient(74% 86% at 67% 38%, #4ECDC4FF 24%, #FF6B6B00 100%),
                  linear-gradient(125deg, #FF6B6BCC 1%, #FFFFFFFF 100%);
        background-size: 200% 200%;
        animation: gradient 10s ease infinite;
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
        background-color: rgba(255, 255, 255, 0.4);
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
                    rounded text-black border-black hover:text-gray-600
                    hover:border-gray-600
                    active:scale-95 duration-100
    }
</style>