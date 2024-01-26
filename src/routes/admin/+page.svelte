<script lang="ts">
import { TERM_MAP } from "$lib/constants";
import AdminHeader from "./AdminHeader.svelte";

export let data;

let term: string = "";

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

</script>

<svelte:head>
    <title>TigerJunction Admin Dashboard</title>
</svelte:head>

<main class="h-screen flex flex-col bg-zinc-100 dark:bg-synth-medium">
    <AdminHeader supabase={data.supabase} />

    <div class="w-screen px-12 pb-4">
    <div class="colored-container">
        <div class="area bg-std-yellow">
            "Study without desire spoils the memory, and it retains nothing that it takes in." - Leonardo da Vinci
        </div>
        <div class="area bg-std-pink">
            "Dwell on the beauty of life. Watch the stars, and see yourself running with them." - Marcus Aurelius
        </div>
        <div class="area bg-std-blue">
            "Be a yardstick of quality. Some people aren't used to an environment where excellence is expected." - Steve Jobs
        </div>
        <div class="area bg-std-green">
            "When you believe in a thing, believe in it all the way, implicitly and unquestionable." - Walt Disney
        </div>
    </div> <!-- * End Colored Data -->

    <div class="cont">
        <div class="area area-std">
            <h2 class="text-2xl font-bold mb-4">DB Management</h2>
            <div class="mb-4 space-x-2 flex items-center">
                <label class="text-lg" for="term">Term: </label>
                <input type="text" name="term" id="term" bind:value={term}
                class="rounded-md p-2 flex-1 
                bg-zinc-300 dark:bg-synth-medium">
            </div>
            <form method="POST" class="flex flex-col gap-2">
                <button formaction="?/pushListings"
                class="btn btn-blue">
                   Push Listings
                </button>
                <button formaction="?/pushCourses"
                class="btn btn-blue">
                   Push Courses
                </button>
                <button formaction="?/pushRatings"
                class="btn btn-blue">
                   Push Ratings
                </button>
                <hr class="my-2 border-zinc-400" />
                <button formaction="?/rapidPush"
                class="btn btn-green">
                   Rapid Seat Refresh
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
            <h2 class="text-2xl font-bold mb-2">Information</h2>
            <h3 class="text-xl font-semibold mb-1">Term Codes</h3>
            <div class="space-y-1">
                {#each Object.keys(TERM_MAP) as term}
                    <div class="flex justify-between">
                        <span>
                            {term.split("_")[0].slice(0, 1) 
                            + term.split("_")[0].slice(1).toLowerCase() 
                            + " " 
                            + term.split("_")[1]}
                        </span>
                        <span class="font-bold">{TERM_MAP[term]}</span>
                    </div>
                {/each}
            </div> <!-- * End Term Codes -->
            <h3 class="text-xl font-semibold mt-4 mb-1">Notes</h3>
            <p>
                Evaluations are Fall 2020 and forward
            </p>
        </div> <!-- * End Information -->
    </div> <!-- * End Container -->
    </div>
</main>

<style lang="postcss">
.colored-container {
    @apply grid gap-2 text-sm;
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
    @apply  bg-red-900/20 border-red-900/30 cursor-not-allowed text-zinc-400;
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
    @apply grid gap-2 pt-2;
    margin: 0 auto; 
    grid-template-columns: 1fr;
}

.area {
    @apply p-4 rounded-lg border-[1px] border-zinc-200
    dark:border-zinc-700;
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
