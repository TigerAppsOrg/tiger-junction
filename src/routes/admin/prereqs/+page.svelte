<script lang="ts">
import AdminHeader from "../AdminHeader.svelte";

export let data;

type RegCourse = {
    listing_id: string,
    code: string,
}

type Course = {
    title: string,
    prereqs: string | null,
    description: string,
}

let initialized = false;
let loading = false;
let locked = false;
let courselist: RegCourse[] = [];
let term = 1244;

let previousCourse: Course;
let currentCourse: Course;
let nextCourse: Course;
let currentCourseIndex = 0;

const handleInit = async () => {
    loading = true;
    console.log("Initializing prereq manager for term: ", term);

    const rawCourselist = await fetch("/api/admin/prereqs/courselist?term=" + term)
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

    const firstRaw = await fetch("/api/admin/prereqs/course?term=" + term + "&id=" + courselist[0].listing_id);
    currentCourse = processRawCourse(await firstRaw.json());
    previousCourse = currentCourse;

    const secondRaw = await fetch("/api/admin/prereqs/course?term=" + term + "&id=" + courselist[1].listing_id);
    nextCourse = processRawCourse(await secondRaw.json());

    console.log("Initialized with courses: ", currentCourse, nextCourse)

    loading = false;
    initialized = true;
}

const handleEnter = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
        gotoIndex(parseInt((e.target as HTMLInputElement).value));
    }
}

//----------------------------------------------------------------------

// ! Warning - this is a very naive implementation 
const handleNextCourse = async () => {
    if (currentCourseIndex === courselist.length - 1) return;
    if (locked) return;
    locked = true;

    currentCourseIndex++;
    previousCourse = currentCourse;
    currentCourse = nextCourse;


    const rawNext = await fetch("/api/admin/prereqs/course?term=" 
        + term + "&id=" + courselist[currentCourseIndex + 1].listing_id);
    nextCourse = processRawCourse(await rawNext.json());
    locked = false;
}

const handlePreviousCourse = async () => {
    if (currentCourseIndex === 0) return;
    if (locked) return;
    locked = true;

    currentCourseIndex--;
    nextCourse = currentCourse;
    currentCourse = previousCourse;

    if (currentCourseIndex === 0) {
        previousCourse = currentCourse;
        locked = false;
        return;
    }

    const rawPrevious = await fetch("/api/admin/prereqs/course?term=" 
        + term + "&id=" + courselist[currentCourseIndex - 1].listing_id);
    previousCourse = processRawCourse(await rawPrevious.json());

    locked = false;
}

const gotoIndex = async (index: number) => {
    if (locked) return;
    if (index < 1 || index > courselist.length) return;
    locked = true;

    const rawCurrent = await fetch("/api/admin/prereqs/course?term="
        + term + "&id=" + courselist[index - 1].listing_id);

    // Yes this is a bit ugly but it doesn't matter it works
    switch (index) {
        case 1:
            const rawNext = await fetch("/api/admin/prereqs/course?term="
                + term + "&id=" + courselist[index].listing_id);
            nextCourse = processRawCourse(await rawNext.json());
            currentCourse = processRawCourse(await rawCurrent.json());
            previousCourse = currentCourse;
            currentCourseIndex = 0;
            locked = false;
            return;
        case courselist.length:
            const rawPrevious = await fetch("/api/admin/prereqs/course?term=" 
                + term + "&id=" + courselist[index - 2].listing_id);
            previousCourse = processRawCourse(await rawPrevious.json());
            currentCourse = processRawCourse(await rawCurrent.json());
            nextCourse = currentCourse;
            currentCourseIndex = index - 1;
            locked = false;
            return;
    }

    const rawPrevious = await fetch("/api/admin/prereqs/course?term=" 
        + term + "&id=" + courselist[index - 2].listing_id);
    const rawNext = await fetch("/api/admin/prereqs/course?term="
        + term + "&id=" + courselist[index].listing_id);
    previousCourse = processRawCourse(await rawPrevious.json());
    nextCourse = processRawCourse(await rawNext.json());
    currentCourse = processRawCourse(await rawCurrent.json());

    currentCourseIndex = index - 1;
    locked = false;
}

const processRawCourse = (rawCourse: any): Course => {
    const details = rawCourse.course_details.course_detail[0];
    return {
        title: details.crosslistings + ": " + details.long_title,
        prereqs: details.other_restrictions,
        description: details.description,
    }
}
</script>

<main class="h-screen bg-zinc-900 text-white">
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
        <div class="rounded-lg p-4 border-[1px] border-zinc-600 w-11/12 max-w-5xl mx-auto
        mt-6">
            <div class="space-y-2 mb-2">
                <h1 class="text-xl">
                    {currentCourseIndex + 1} / {courselist.length} - 
                    {currentCourse.title || "ERROR"}
                </h1>
                <!-- <p>
                    <span class="underline">Description: </span>
                    {currentCourse.description || "No Descrition"}
                </p> -->
                <p>
                    <span class="underline">Prerequisites: </span>
                    {currentCourse.prereqs || "None"}
                </p>
            </div>
            <div class="flex gap-2">
                <button class="handlerButton bg-orange-400 hover:bg-orange-500"
                on:click={handlePreviousCourse}>
                    Previous
                </button>
                <input type="text" class="flex-1 rounded-md px-4 py-2 text-black" 
                placeholder="Go to index"
                on:keydown={handleEnter}>
                <button class="handlerButton bg-blue-400 hover:bg-blue-500"
                on:click={handleNextCourse}>
                    Next
                </button>
            </div>
        </div>
    {/if}
</main>

<style lang="postcss">
    .handlerButton {
        @apply rounded-md px-4 py-2 w-40 flex-1 duration-150;
    }

    .handlerButton:active {
        @apply transform scale-95;
    }

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