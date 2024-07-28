<script lang="ts">
    import { toastStore } from "$lib/stores/toast";
    import { onMount } from "svelte";
    import AdminHeader from "../AdminHeader.svelte";

    export let data;

    type Course = {
        title: string;
        id: string;
        prereqs: string | null;
        description: string;
        other: string | null;
        equiv: string | null;
    };

    let initialized = false;
    let loading = false;
    let courselist: Course[] = [];
    let term = 1244;

    let currentCourseIndex = 0;
    $: currentCourse = courselist[currentCourseIndex];

    const handleInit = async () => {
        loading = true;
        console.log("Initializing prereq manager for term: ", term);

        const ca = await fetch("/api/admin/prereqs/cache?term=" + term);
        if (!ca.ok) {
            console.error("Failed to fetch courselist");
            loading = false;
            toastStore.add(
                "error",
                "Invalid term or failed to fetch courselist"
            );
            return;
        }

        const jsonCourselist = await ca.json();
        courselist = jsonCourselist.map((details: any) => {
            return {
                title: details.crosslistings + ": " + details.long_title,
                id: details.course_id,
                prereqs: details.other_restrictions,
                description: details.description,
                other: details.other_information,
                equiv: details.course_equivalents.hasOwnProperty(
                    "course_equivalent"
                )
                    ? details.course_equivalents.course_equivalent
                          .map((x: { subject: string; catnum: string }) => {
                              return x.subject + x.catnum;
                          })
                          .join(", ")
                    : null
            };
        });

        loading = false;
        initialized = true;
    };

    const handleEnter = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            gotoIndex((e.target as HTMLInputElement).value);
            (e.target as HTMLInputElement).value = "";
        }
    };

    const watchArrows = (e: KeyboardEvent) => {
        if (e.key === "ArrowRight") {
            handleNextCourse();
        } else if (e.key === "ArrowLeft") {
            handlePreviousCourse();
        }
    };

    //----------------------------------------------------------------------

    // ! Warning - this is a very naive implementation
    const handleNextCourse = () => {
        if (currentCourseIndex === courselist.length - 1) {
            toastStore.add("error", "No next course");
            return;
        }

        currentCourseIndex++;
    };

    const handlePreviousCourse = async () => {
        if (currentCourseIndex === 0) {
            toastStore.add("error", "No previous course");
            return;
        }

        currentCourseIndex--;
    };

    const gotoIndex = async (index: string) => {
        const indexNum = parseInt(index);

        if (isNaN(indexNum)) {
            const searchIndex = courselist.findIndex(
                x => x.title.split(" ")[0].toLowerCase() === index.toLowerCase()
            );
            if (searchIndex === -1) {
                toastStore.add("error", "Invalid index");
                return;
            }
            currentCourseIndex = searchIndex;
            return;
        }

        if (indexNum < 1 || indexNum > courselist.length) {
            toastStore.add("error", "Invalid index");
            return;
        }

        currentCourseIndex = indexNum - 1;
    };

    onMount(() => {
        document.addEventListener("keydown", watchArrows);
    });
</script>

<svelte:head>
    <title>TigerJunction Prereq Manager</title>
</svelte:head>

<main class="h-screen bg-zinc-900 text-white">
    <AdminHeader supabase={data.supabase} />

    {#if !initialized}
        <div class="mx-auto mt-6 text-center">
            <h1 class="text-3xl font-bold text-white mb-6">
                Prerequisite Manager of Death
            </h1>
            {#if !loading}
                <div class="flex items-center justify-center gap-4">
                    <input
                        type="text"
                        placeholder="Enter term"
                        class="textinput"
                        bind:value={term} />
                    <button class="button-85" on:click={() => handleInit()}>
                        Start
                    </button>
                </div>
            {:else}
                <p class="text-xl mb-2">Loading...</p>
                <svg
                    class="ip mx-auto"
                    viewBox="0 0 256 128"
                    width="256px"
                    height="128px"
                    xmlns="http://www.w3.org/2000/svg">
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
                            <path
                                d="M8,64s0-56,60-56,60,112,120,112,60-56,60-56" />
                            <path
                                d="M248,64s0-56-60-56-60,112-120,112S8,64,8,64" />
                        </g>
                        <g stroke-dasharray="180 656">
                            <path
                                class="ip__worm1"
                                stroke="url(#grad1)"
                                stroke-dashoffset="0"
                                d="M8,64s0-56,60-56,60,112,120,112,60-56,60-56" />
                            <path
                                class="ip__worm2"
                                stroke="url(#grad2)"
                                stroke-dashoffset="358"
                                d="M248,64s0-56-60-56-60,112-120,112S8,64,8,64" />
                        </g>
                    </g>
                </svg>
            {/if}
        </div>
    {:else}
        <div
            class="rounded-lg p-4 border-[1px] border-zinc-600 w-11/12 max-w-5xl mx-auto
        mt-6">
            <div class="space-y-2 mb-2">
                <a
                    class="text-xl hover:text-zinc-200 duration-100"
                    target="_blank"
                    href={`https://registrar.princeton.edu/course-offerings/course-details?courseid=${currentCourse.id}&term=${term}`}>
                    {currentCourseIndex + 1} / {courselist.length} -
                    {currentCourse.title || "ERROR"}
                </a>
                <!-- <p>
                    <span class="underline">Description: </span>
                    {currentCourse.description || "No Descrition"}
                </p> -->
                <p>
                    <span class="underline">Prerequisites: </span>
                    {currentCourse.prereqs || "None."}
                </p>
                {#if currentCourse.equiv}
                    <p>
                        <span class="underline">Equivalents: </span>
                        {currentCourse.equiv}
                    </p>
                {/if}
                {#if currentCourse.other}
                    <p>
                        <span class="underline">Other: </span>
                        {currentCourse.other}
                    </p>
                {/if}
            </div>
            <div class="flex gap-2">
                <button
                    class="handlerButton bg-orange-400 hover:bg-orange-500"
                    on:click={handlePreviousCourse}>
                    Previous
                </button>
                <input
                    type="text"
                    class="textinput flex-1"
                    placeholder="Go to index"
                    on:keydown={handleEnter} />
                <button
                    class="handlerButton bg-blue-400 hover:bg-blue-500"
                    on:click={handleNextCourse}>
                    Next
                </button>
            </div>
        </div>
    {/if}
</main>

<style lang="postcss">
    .textinput {
        padding: 6px 12px;
        background: rgb(31, 32, 35);
        border: 1px solid rgb(60, 63, 68);
        border-radius: 4px;
        color: rgb(247, 248, 248);
        height: 46px;
        width: 150px;
        appearance: none;
        transition: border 0.1s ease 0s;
    }

    .textinput:focus {
        outline: none;
        box-shadow: none;
        border-color: rgb(100, 153, 255);
    }

    .handlerButton {
        @apply rounded-md px-4 py-2 w-40 flex-1 duration-150;
    }

    :root {
        --hue: 200;
        --bg: hsl(var(--hue), 90%, 95%);
        --fg: hsl(var(--hue), 90%, 5%);
        --trans-dur: 0.3s;
    }

    .ip {
        width: 8em;
        height: 4em;
    }
    .ip__track {
        stroke: hsl(var(--hue), 90%, 90%);
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
            --bg: hsl(var(--hue), 90%, 5%);
            --fg: hsl(var(--hue), 90%, 95%);
        }
        .ip__track {
            stroke: hsl(var(--hue), 90%, 15%);
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
