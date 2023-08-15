<script lang="ts">
import { enhance } from "$app/forms";
import { goto } from "$app/navigation";
import { TERM_MAP } from "$lib/constants.js";

export let data;

let term: string = "";
let loading: boolean = false;

const handleLogout = async () => { 
    const { error } = await data.supabase.auth.signOut();
    if (!error) goto("/");
}
</script>

<main class="h-screen bg-slate-100">
    <div class="text-white py-2 px-10 flex justify-between
    items-center {loading ? "bg-tertiary" : "bg-primary"}">
        <h1 class="text-xl">TigerJunction Admin Dashboard</h1>
        <button class="bg-white text-black p-1 rounded-lg
        hover:bg-gray-200 duration-150"
        on:click={handleLogout}>
            Logout
        </button>
    </div>
    <div class="flex mt-10">
        <div class="area mx-10 border-accent">
            <h2 class="text-xl text-center mb-4">Static DB Management</h2>
            <form action="?/getTerm" method="POST"
            use:enhance={() => {
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
                    <button formaction="?/getIds"
                    class="btn bg-orange-400 hover:bg-orange-600 duration-150">
                        Get Term Ids
                    </button>
                    <button type="submit" 
                    class="btn bg-orange-400 hover:bg-orange-600 duration-150">
                        Get Term Courselist
                    </button>
                    <button formaction="?/postTerm"
                    class="btn bg-orange-400 hover:bg-orange-600 duration-150">
                        Post Term Courselist to Supabase
                    </button>
                    <button formaction="?/pushListings"
                    class="btn bg-red-400 hover:bg-red-600 duration-150"
                    >
                        Post Term Listings to Supabase
                    </button>

                    <hr class="my-2" />

                    <!-- Evaluations -->
                    <button formaction="?/getEvaluations" 
                    class="btn bg-green-400 hover:bg-green-600 duration-150">
                        Get Term Course Evaluations
                    </button>
                    <button formaction="?/pushEvaluations" 
                    class="btn bg-green-400 hover:bg-green-600 duration-150">
                        Post Term Course Evaluations to Supabase
                    </button>
                </div>
            </form>
        </div>
        <div class="area border-red-500 mr-10">
            <h2 class="text-xl text-center mb-4">Mass Deletions</h2>
            <div class="flex flex-col gap-1">
                <form action="?/getTerm" method="POST"
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
                    class="btn bg-red-500 hover:bg-red-700 duration-150">
                        Delete All Listings
                    </button>
                </form>
            </div>
        </div>
        <div class="area mr-10 border-secondary">
            <h2 class="text-xl text-center mb-4">Term Codes</h2>
            <div class="space-y-2">
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
        </div>
    </div>
</main>

<style lang="postcss">
    .btn {
        @apply py-2 px-4 rounded-lg;
    }

    .area {
        @apply bg-white w-fit p-6 rounded-xl border-2;
    }
</style>
