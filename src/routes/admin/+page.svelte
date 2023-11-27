<script lang="ts">
import { enhance } from "$app/forms";
import { goto } from "$app/navigation";
import LightButton from "$lib/components/general/LightButton.svelte";
// import homeIcon from "$lib/img/icons/homeicon.svg";
import { TERM_MAP } from "$lib/constants";

export let data;

const API_PREFIX = "/api/admin/scraper/"

let term: string = "";
let loading: boolean = false;

// Safety on mass deletions
// let enableMassDelete: boolean = false;
// let massDeleteTimeout: NodeJS.Timeout;

// Toggle mass delete and handle timeout for auto-disable
// const toggleMassDelete = () => {
//     enableMassDelete = !enableMassDelete;
//     if (enableMassDelete) {
//         alert("WARNING: Mass deletion enabled!");

//         // Disable mass delete after 10 seconds
//         massDeleteTimeout = setTimeout(() => {
//             enableMassDelete = false;
//         }, 10000);
//     } else {
//         clearTimeout(massDeleteTimeout);
//     }
// }

// Logout the user
const handleLogout = async () => { 
    const { error } = await data.supabase.auth.signOut();
    if (!error) goto("/");
}

/**
 * Hit an API endpoint and handle loading and postloading
 * @param fetcher The fetcher function to use
 */
const submitEvent = async (fetcher: () => Promise<Response>) => {    
    // Check for valid term code
    if (!Object.values(TERM_MAP).includes(parseInt(term))) {
        alert("Invalid term code!");
        term = "";
        return;
    }

    // Prelude
    term = "";
    loading = true;
    console.log("loading...");

    // Hit API
    const result = await fetcher();

    // Postlude
    loading = false;
    console.log(result);
}
</script>

<svelte:head>
    <title>TigerJunction Admin Dashboard</title>
</svelte:head>

<main class="h-screen flex flex-col bg-slate-100 dark:bg-synth-medium">
    <div class="px-4 flex justify-between items-center 
    {loading ? "bg-red-500" : 
    "bg-slate-300 text-black dark:text-white dark:bg-synth-dark"} rounded-xl mx-12 mt-4">
        <div class="flex items-center gap-2">
            <img src="tjlogolarge.png" alt="Tiger Junction logo"
            class="w-16 h-16">
            <h1 class="text-xl">TigerJunction Admin Dashboard</h1>
        </div>
        <div class="flex gap-4">
            <a href="/home" class="flex justify-center items-center 
            hover:text-slate-600
            gap-1 text-xl duration-150 dark:hover:text-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
                class="w-6 h-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>              
                Home
            </a>
            <button class="dark:hover:text-gray-200
            hover:text-slate-600
            duration-150 text-xl
            flex items-center gap-1"
            on:click={handleLogout}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
                class="w-6 h-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>          
                Logout
            </button>
            <LightButton></LightButton>
        </div>
    </div> <!-- * End Navbar -->

    <div class="w-screen px-12 pb-4">
    <div class="colored-container">
        <div class="area bg-yellow-300">
            "Study without desire spoils the memory, and it retains nothing that it takes in." - Leonardo da Vinci
        </div>
        <div class="area bg-pink-400">
            "Dwell on the beauty of life. Watch the stars, and see yourself running with them." - Marcus Aurelius
        </div>
        <div class="area bg-cyan-400">
            "Be a yardstick of quality. Some people aren't used to an environment where excellence is expected." - Steve Jobs
        </div>
        <div class="area bg-green-400">
            "When you believe in a thing, believe in it all the way, implicitly and unquestionable." - Walt Disney
        </div>
    </div> <!-- * End Colored Data -->

    <div class="cont">
        <div class="area area-std">
            <h2 class="text-2xl font-bold mb-4">DB Management</h2>
            <div class="mb-4 space-x-2 flex items-center">
                <label class="text-lg" for="term">Term: </label>
                <input type="text" name="term" id="term" bind:value={term}
                class="rounded-xl p-2 flex-1 
                bg-slate-300 dark:bg-synth-medium">
            </div>
            <div class="flex flex-col gap-2">
                <hr class="my-2" />

                <!-- Courses -->
                <button
                on:click={() => submitEvent(() => fetch(`${API_PREFIX}courses/${term}`))}
                class="btn btn-blue">
                    Post Term Listings 
                </button>
                <button 
                on:click={() => submitEvent(() => fetch(`${API_PREFIX}courses/${term}`))}
                class="btn btn-blue">
                    Post Term Courses 
                </button>
                <button 
                on:click={() => submitEvent(() => fetch(`/api/admin/redis-transfer/courses/${term}`))}
                class="btn btn-blue">
                    Transfer Courses to Redis
                </button>
                <button 
                on:click={() => submitEvent(() => fetch(`${API_PREFIX}evaluations/${term}`))}
                class="btn btn-blue">
                    Post Term Evaluations
                </button>
                <button
                on:click={() => submitEvent(() => fetch(`${API_PREFIX}ratings/${term}`))}
                class="btn btn-blue">
                    Post Course Ratings
                </button>
                <button 
                on:click={() => submitEvent(() => fetch(`${API_PREFIX}programs/${term}`))}
                class="btn btn-blue">
                    Post Programs 
                </button>
                <button 
                on:click={() => submitEvent(() => fetch(`${API_PREFIX}prereqs/${term}`))}
                class="btn btn-blue">
                    Post Prereqs
                </button>
                <hr class="mt-2 mb-3 border-slate-400" />
            </div>

            <!-- * Testing -->
            <form action="?/test" method="POST" use:enhance={() => {
                return async ({ result }) => {
                    console.log(result);
                } 
            }}>
                <button class="btn btn-green w-full">
                    Run Tests
                </button>
            </form>
        </div> <!-- * End Static DB Management -->
        
        <div class="area area-std">
            <form method="POST">
                <button formaction="?/pushListings"
                class="btn">
                   Push Listings
                </button>
                <button formaction="?/pushCourses"
                class="btn">
                   Push Courses
                </button>
                <button formaction="?/pushRatings"
                class="btn">
                   Push Ratings
                </button>
                <button formaction="?/rapidPush"
                class="btn">
                   RAPID RECAL!!!!
                </button>
            </form>
        </div>

        <!-- <div class="area area-std">
            <h2 class="text-2xl font-bold mb-4">Mass Deletion</h2>
            <div class="flex flex-col gap-1">
                <form method="POST"
                class="flex flex-col gap-2"
                use:enhance={() => {
                    term = "";
                    loading = true;
                    console.log("loading...");
    
                    return async ({ result }) => {
                        loading = false;
                        console.log(result);
                    }
                }}>
                    <button formaction="?/deleteAllListings"
                    class="btn
                    {enableMassDelete ? "btn-danger" : "btn-protected"}"
                    disabled={!enableMassDelete}>
                        Delete All Listings
                    </button>
                    <button formaction="?/deleteAllCourses"
                    class="btn 
                    {enableMassDelete ? "btn-danger" : "btn-protected"}"
                    disabled={!enableMassDelete}>
                        Delete All Courses
                    </button>
                    <button formaction="?/deleteAllInstructors"
                    class="btn
                    {enableMassDelete ? "btn-danger" : "btn-protected"}" 
                    disabled={!enableMassDelete}>
                        Delete All Instructors
                    </button>
                    <button formaction="?/deleteAllEvaluations"
                    class="btn
                    {enableMassDelete ? "btn-danger" : "btn-protected"}" 
                    disabled={!enableMassDelete}>
                        Delete All Evaluations
                    </button>
                    <button formaction="?/resetAllRatings"
                    class="btn
                    {enableMassDelete ? "btn-danger" : "btn-protected"}" 
                    disabled={!enableMassDelete}>
                        Reset all Ratings
                    </button>
                    <button formaction="?/deleteAllPrograms"
                    class="btn
                    {enableMassDelete ? "btn-danger" : "btn-protected"}" 
                    disabled={!enableMassDelete}>
                        Delete All Programs
                    </button>
                    <button formaction="?/deleteAllPrereqs"
                    class="btn
                    {enableMassDelete ? "btn-danger" : "btn-protected"}" 
                    disabled={!enableMassDelete}>
                        Delete All Prereqs
                    </button>
                    <button formaction="?/deleteAllSectionData"
                    class="btn
                    {enableMassDelete ? "btn-danger" : "btn-protected"}" 
                    disabled={!enableMassDelete}>
                        Delete All Section Data
                    </button>
                </form>
                
                <hr class="my-2 border-slate-400" />
                <button
                class="btn 
                {enableMassDelete ? "btn-danger": "btn-green"}" 
                on:click={toggleMassDelete}>
                    {#if enableMassDelete}
                        Disable Mass Delete
                    {:else}
                        Enable Mass Delete
                    {/if}
                </button>
            </div>
        </div>  -->

        <div class="area area-std">
            <h2 class="text-2xl font-bold mb-4">Information</h2>
            <h3 class="text-xl font-bold mb-2">Term Codes</h3>
            <div class="space-y-2 col grid-cols-2 columns-2">
                {#each Object.keys(TERM_MAP) as term}
                    <div class="space-x-2">
                        <span>
                            {term.split("_")[0].slice(0, 1) 
                            + term.split("_")[0].slice(1).toLowerCase() 
                            + " " 
                            + term.split("_")[1]}:
                        </span>
                        <span class="font-bold">{TERM_MAP[term]}</span>
                    </div>
                {/each}
            </div> <!-- * End Term Codes -->
            <h3 class="text-xl font-bold mt-8 mb-2">Notes</h3>
            <p>
                Evaluations go to Fall 2020 
            </p>
        </div> <!-- * End Information -->
    </div> <!-- * End Container -->
    </div>
</main>

<style lang="postcss">
.colored-container {
    @apply grid gap-4 pt-4 text-sm;
    margin: 0 auto;
    grid-template-columns: 1fr;
}

.btn {
    @apply py-2 px-4 rounded-full duration-150 border-2 border-solid;
}

/*
.btn-danger {
    @apply bg-red-500/40 border-red-500/50 
    hover:bg-red-500/80 hover:border-red-500/90;
}
*/

/*
.btn-protected {
    @apply  bg-red-900/20 border-red-900/30 cursor-not-allowed text-gray-400;
}
*/

.btn-blue {
    @apply bg-blue-500/40 border-blue-500/50 
    hover:bg-blue-500/80 hover:border-blue-500/90;
}

.btn-blue:hover {
    box-shadow: rgba(58, 130, 246) 0px 0px 3px 0px;
}

.btn-green {
    @apply bg-green-500/40 border-green-500/50 
    hover:bg-green-500/80 hover:border-green-500/90;
}

.btn-green:hover {
    box-shadow: rgba(34, 197, 94) 0px 0px 3px 0px;
}

.cont {
    @apply grid gap-4 pt-4;
    margin: 0 auto; 
    grid-template-columns: 1fr;
}

.area {
    @apply p-6 rounded-xl;
}

.area-std {
    @apply dark:bg-synth-light dark:text-white
    bg-white text-black;
}

@media (min-width: 768px) {
    .cont {
        grid-template-columns: repeat(3, 1fr); 
    }

    .colored-container {
        grid-template-columns: repeat(4, 1fr);
    }
}
</style>
