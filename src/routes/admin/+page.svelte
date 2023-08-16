<script lang="ts">
import { enhance } from "$app/forms";
import { goto } from "$app/navigation";
import { TERM_MAP } from "$lib/constants.js";

export let data;

let term: string = "";
let loading: boolean = false;

// Safety on mass deletions
let enableMassDelete: boolean = false;
let massDeleteTimeout: NodeJS.Timeout;

// Toggle mass delete and handle timeout for auto-disable
const toggleMassDelete = () => {
    enableMassDelete = !enableMassDelete;
    if (enableMassDelete) {
        alert("WARNING: Mass deletion enabled!");

        // Disable mass delete after 15 seconds
        massDeleteTimeout = setTimeout(() => {
            enableMassDelete = false;
        }, 5000);
    } else {
        clearTimeout(massDeleteTimeout);
    }
}

// Logout the user
const handleLogout = async () => { 
    const { error } = await data.supabase.auth.signOut();
    if (!error) goto("/");
}

</script>

<main class="h-screen flex flex-col">
    <div class="text-white px-10 flex justify-between items-center 
    {loading ? "bg-red-500" : 
    "bg-gradient-to-tl from-primary to-tertiary"}">
        <div class="flex items-center gap-2">
            <img src="tjlogolarge.png" alt="Tiger Junction logo"
            class="w-16 h-16">
            <h1 class="text-xl">TigerJunction Admin Dashboard</h1>
        </div>
        <button class="hover:text-gray-200 duration-150 text-xl
        flex items-center gap-1"
        on:click={handleLogout}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
            class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>          
            Logout
        </button>
    </div> <!-- * End Navbar -->

    <div class="container">
        <div class="area">
            <h2 class="text-xl text-center mb-4">Static DB Management</h2>
            <form method="POST" use:enhance={({ cancel }) => {
                // Validate term code
                if (!Object.values(TERM_MAP).includes(parseInt(term))) {
                    alert("Invalid term code!");
                    cancel();
                    return;
                }

                term = "";
                loading = true;
                console.log("loading...");

                return async ({ result }) => {
                    loading = false;
                    console.log(result);
                } 
            }}>
                <div class="mb-4 space-x-2">
                    <label for="term">Term: </label>
                    <input type="text" name="term" id="term" bind:value={term}
                    class="border-2 border-primary rounded-md p-1">
                </div>
                <div class="flex flex-col gap-1">
                    <hr class="my-2" />

                    <!-- Courses -->
                    <button formaction="?/pushListings"
                    class="btn btn-blue">
                        Post Term Listings to Supabase
                    </button>
                    <button formaction="?/pushCourses"
                    class="btn btn-blue">
                        Post Term Courses to Supabase
                    </button>

                    <hr class="my-2 border-slate-400" />
                </div>
            </form>

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

        <div class="area">
            <h2 class="text-xl text-center mb-4">Mass Deletions</h2>
            <div class="flex flex-col gap-1">
                <form method="POST"
                class="flex flex-col gap-1"
                use:enhance={() => {
                    term = "";
                    loading = true;
                    console.log("loading...");
    
                    return async ({ result }) => {
                        loading = false;
                        console.log(result);
                    }
                }}>
                    <!-- Courses -->
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
                </form>
                
                <hr class="my-2 border-slate-400" />
                <!-- * Toggle Mass Delete -->
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
        </div> <!-- * End Mass Deletions-->

        <div class="area">
            <h2 class="text-xl text-center mb-4">Term Codes</h2>
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
            </div>
        </div> <!-- * End Term Codes -->
    </div> <!-- * End Container -->
</main>

<style lang="postcss">
.btn {
    @apply py-2 px-4 rounded-full duration-150 border-2 border-solid;
}

.btn-danger {
    @apply bg-red-500/20 border-red-500/30 
    hover:bg-red-500/40 hover:border-red-500/60;
}

.btn-protected {
    @apply  bg-red-900/20 border-red-900/30 cursor-not-allowed;
}

.btn-blue {
    @apply bg-blue-500/20 border-blue-500/30 
    hover:bg-blue-500/40 hover:border-blue-500/60;
}

.btn-blue:hover {
    box-shadow: rgba(58, 130, 246) 0px 0px 3px 0px;
}

.btn-green {
    @apply bg-green-500/20 border-green-500/30 
    hover:bg-green-500/40 hover:border-green-500/60;
}

.btn-green:hover {
    box-shadow: rgba(34, 197, 94) 0px 0px 3px 0px;
}

.container {
    @apply grid gap-4 pt-4;
    margin: 0 auto; 
    grid-template-columns: 1fr;
}

.area {
    @apply bg-slate-200 p-6 rounded-xl;
}

@media (min-width: 768px) {
    .container {
        grid-template-columns: repeat(3, 1fr); 
    }
}
</style>
