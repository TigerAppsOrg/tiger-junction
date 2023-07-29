<script lang="ts">
    import { enhance } from "$app/forms";
    import { goto } from "$app/navigation";

    export let data;
    export let form;
    $: console.log(form);

    const handleLogout = async () => { 
        const { error } = await data.supabase.auth.signOut();
        if (!error) goto("/");
    }
</script>

<main>
    <div class="bg-black text-white py-2 px-10 flex justify-between
    items-center">
        <h1 class="text-xl">TigerJunction Admin Dashboard</h1>
        <button class="bg-white text-black p-1 rounded-lg
        hover:bg-gray-200 duration-150"
        on:click={handleLogout}>
            Logout
        </button>
    </div>
    <div class="flex justify-between">
        <div class="area mx-10 mt-10">
            <h2 class="text-xl text-center mb-4">Static DB Management</h2>
            <form action="?/getTerm" method="POST" use:enhance>
                <div class="mb-4">
                    <label for="term">Term: </label>
                    <input type="text" name="term" id="term" 
                    class="border-2 border-primary rounded-md p-1">
                </div>
                <div class="flex flex-col gap-1">
                    <hr class="my-2" />

                    <!-- Courses -->
                    <button type="submit" 
                    class="btn bg-orange-400 hover:bg-orange-600 duration-150">
                        Get Term Courselist
                    </button>
                    <button formaction="?/postTerm"
                    class="btn bg-orange-400 hover:bg-orange-600 duration-150">
                        Post Term Courselist to Supabase
                    </button>

                    <hr class="my-2" />

                    <!-- Evaluations -->
                    <button formaction="?/getEvaluation" 
                    class="btn bg-green-400 hover:bg-green-600 duration-150">
                        Get Term Course Evaluations
                    </button>
                    <button formaction="?/getEvaluation" 
                    class="btn bg-green-400 hover:bg-green-600 duration-150">
                        Post Term Course Evaluations to Supabase
                    </button>
                </div>
            </form>
        </div>
    </div>
</main>

<style lang="postcss">
    .btn {
        @apply py-2 px-4 rounded-lg;
    }

    .area {
        @apply bg-slate-100 w-fit p-6 rounded-xl border-2 border-gray-300;
    }
</style>
