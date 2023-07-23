<script lang="ts">
    import { enhance } from "$app/forms";

    export let form;
    $: console.log(form);
</script>

<main>
    <div>
        <h1 class="text-2xl">Admin Dashboard</h1>
    </div>
    <div>
        <form action="?/getTerm" method="POST" use:enhance>
            <label for="term">Term</label>
            <input type="text" name="term" id="term" required>
            <div class="space-x-2">
                <button type="submit" class="btn bg-primary">Get</button>
                <button formaction="?/postTerm" class="btn bg-accent">Post</button>
                <button formaction="?/postAll" class="btn bg-red-500">Post All</button>
            </div>
        </form>
    </div>
</main>

<style lang="postcss">
    .btn {
        @apply py-2 px-4 rounded-lg;
    }
</style>
