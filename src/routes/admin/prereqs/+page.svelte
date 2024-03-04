<script lang="ts">
import AdminHeader from "../AdminHeader.svelte";

export let data;

type RegCourse = {
    listing_id: string,
    code: string,
}

let initialized = false;
let loading = false;
let courselist: RegCourse[] = [];

const handleInit = async (term: number = 1244) => {
    loading = true;
    console.log("Initializing prereq manager for term: ", term);

    const rawCourselist = await fetch("/api/admin/prereqs?term=" + term)
    if (!rawCourselist.ok) {
        console.error("Failed to fetch courselist");
        return;
    }

    const jsonCourselist = await rawCourselist.json();
    courselist = jsonCourselist.classes.class.map((x: any) => {
        return {
            listing_id: x.course_id,
            code: x.crosslistings.replace(/\s/g, ""),
        }
    });

    loading = false;
    initialized = true;
}
</script>

<main class="h-screen flex flex-col bg-zinc-900 text-white">
    <AdminHeader supabase={data.supabase} />

    {#if !initialized}
        <div class="mx-auto mt-6 text-center">
            <h1 class="text-3xl font-bold text-white mb-6">
                Prerequisite Manager of Death
            </h1>
            {#if !loading}
            <button class="button-85" on:click={() => handleInit()}>
                Start
            </button>
            {:else}
            <p class="text-xl mb-2">
                Loading...
            </p>
            <svg class="ip mx-auto" viewBox="0 0 256 128" width="256px" height="128px" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="grad1" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stop-color="#5ebd3e" />
                        <stop offset="33%" stop-color="#ffb900" />
                        <stop offset="67%" stop-color="#f78200" />
                        <stop offset="100%" stop-color="#e23838" />
                    </linearGradient>
                    <linearGradient id="grad2" x1="1" y1="0" x2="0" y2="0">
                        <stop offset="0%" stop-color="#e23838" />
                        <stop offset="33%" stop-color="#973999" />
                        <stop offset="67%" stop-color="#009cdf" />
                        <stop offset="100%" stop-color="#5ebd3e" />
                    </linearGradient>
                </defs>
                <g fill="none" stroke-linecap="round" stroke-width="16">
                    <g class="ip__track" stroke="#ddd">
                        <path d="M8,64s0-56,60-56,60,112,120,112,60-56,60-56"/>
                        <path d="M248,64s0-56-60-56-60,112-120,112S8,64,8,64"/>
                    </g>
                    <g stroke-dasharray="180 656">
                        <path class="ip__worm1" stroke="url(#grad1)" stroke-dashoffset="0" d="M8,64s0-56,60-56,60,112,120,112,60-56,60-56"/>
                        <path class="ip__worm2" stroke="url(#grad2)" stroke-dashoffset="358" d="M248,64s0-56-60-56-60,112-120,112S8,64,8,64"/>
                    </g>
                </g>
            </svg>
            {/if}
        </div>
    {:else}
        <div>

        </div>
    {/if}
</main>

<style>
    :root {
        --hue: 200;
        --bg: hsl(var(--hue),90%,95%);
        --fg: hsl(var(--hue),90%,5%);
        --trans-dur: 0.3s;
    }

    .ip {
        width: 8em;
        height: 4em;
    }
    .ip__track {
        stroke: hsl(var(--hue),90%,90%);
        transition: stroke var(--trans-dur);
    }
    .ip__worm1,
    .ip__worm2 {
        animation: worm1 1s linear infinite;
    }
    .ip__worm2 {
        animation-name: worm2;
    }

    /* Dark theme */
    @media (prefers-color-scheme: dark) {
        :root {
            --bg: hsl(var(--hue),90%,5%);
            --fg: hsl(var(--hue),90%,95%);
        }
        .ip__track {
            stroke: hsl(var(--hue),90%,15%);
        }
    }

    /* Animation */
    @keyframes worm1 {
        from {
            stroke-dashoffset: 0;
        }
        50% {
            animation-timing-function: steps(1);
            stroke-dashoffset: -358;
        }
        50.01% {
            animation-timing-function: linear;
            stroke-dashoffset: 358;
        }
        to {
            stroke-dashoffset: 0;
        }
    }
    @keyframes worm2 {
        from {
            stroke-dashoffset: 358;
        }
        50% {
            stroke-dashoffset: 0;
        }
        to {
            stroke-dashoffset: -358;
        }
    }

    .button-85 {
        padding: 0.6em 2em;
        border: none;
        outline: none;
        color: rgb(255, 255, 255);
        background: #111;
        cursor: pointer;
        position: relative;
        z-index: 0;
        border-radius: 10px;
        user-select: none;
        -webkit-user-select: none;
        touch-action: manipulation;
        transition-duration: 150ms;
    }

    .button-85:active {
        transform: scale(0.95);
    }

    .button-85:before {
        content: "";
        background: linear-gradient(
            45deg,
            #ff0000,
            #ff7300,
            #fffb00,
            #48ff00,
            #00ffd5,
            #002bff,
            #7a00ff,
            #ff00c8,
            #ff0000
        );
        position: absolute;
        top: -2px;
        left: -2px;
        background-size: 400%;
        z-index: -1;
        filter: blur(5px);
        -webkit-filter: blur(5px);
        width: calc(100% + 4px);
        height: calc(100% + 4px);
        animation: glowing-button-85 20s linear infinite;
        transition: opacity 0.3s ease-in-out;
        border-radius: 10px;
    }

    @keyframes glowing-button-85 {
        0% {
            background-position: 0 0;
        }
        50% {
            background-position: 400% 0;
        }
        100% {
            background-position: 0 0;
        }
    }

    .button-85:after {
        z-index: -1;
        content: "";
        position: absolute;
        width: 100%;
        height: 100%;
        background: #222;
        left: 0;
        top: 0;
        border-radius: 10px;
    }
</style>