<script lang="ts">
    import { TERM_MAP } from "$lib/changeme";
    import AdminHeader from "./AdminHeader.svelte";

    export let data;

    let term: string = "";
    let refreshGrading: boolean = false;

    // Set a feedback item to resolved and remove it from the list
    const resolveFeedback = async (feedback: { id: number }) => {
        await data.supabase
            .from("feedback")
            .update({ resolved: true })
            .match({ id: feedback.id });

        data.feedback = data.feedback.filter(
            (f: { id: number }) => f.id !== feedback.id
        );
        data.feedbackCount--;
    };
</script>

<svelte:head>
    <title>TigerJunction Admin Dashboard</title>
</svelte:head>

<main
    class="min-h-screen flex flex-col bg-zinc-100 dark:bg-synth-medium
    h-fit">
    <AdminHeader supabase={data.supabase} />

    <div class="w-screen px-12 pb-4">
        <div class="colored-container">
            <div class="area bg-std-yellow">
                "Study without desire spoils the memory, and it retains nothing
                that it takes in." - Leonardo da Vinci
            </div>
            <div class="area bg-std-pink">
                "Dwell on the beauty of life. Watch the stars, and see yourself
                running with them." - Marcus Aurelius
            </div>
            <div class="area bg-std-blue">
                "Be a yardstick of quality. Some people aren't used to an
                environment where excellence is expected." - Steve Jobs
            </div>
            <div class="area bg-std-green">
                "When you believe in a thing, believe in it all the way,
                implicitly and unquestionable." - Walt Disney
            </div>
        </div>
        <!-- * End Colored Data -->

        <div class="cont">
            <div class="area area-std">
                <h2 class="text-lg font-bold mb-2">DB Management</h2>
                <form method="POST">
                    <div class="mb-2 space-x-2 flex items-center">
                        <label class="text-base" for="term">Term: </label>
                        <input
                            type="text"
                            name="term"
                            id="term"
                            bind:value={term}
                            class="rounded-md p-1 flex-1
                    bg-zinc-300 dark:bg-synth-medium" />
                    </div>
                    <div class="mb-4 flex items-center gap-2">
                        <label
                            class="text-base select-none"
                            for="refreshGrading">
                            Refresh Grading:
                        </label>
                        <input
                            type="checkbox"
                            name="refreshGrading"
                            id="refreshGrading"
                            bind:checked={refreshGrading}
                            class="w-4 h-4 accent-std-green dark:accent-synth-medium" />
                    </div>
                    <div class="flex flex-col gap-2 text-base">
                        <button
                            formaction="?/pushListings"
                            class="btn btn-blue">
                            Push Listings
                        </button>
                        <button formaction="?/pushCourses" class="btn btn-blue">
                            Push Courses
                        </button>
                        <button formaction="?/pushRatings" class="btn btn-blue">
                            Push Ratings
                        </button>
                        <button
                            formaction="?/pushEvaluations"
                            class="btn btn-blue">
                            Push Evaluations
                        </button>
                        <button
                            formaction="?/redisTransfer"
                            class="btn btn-green">
                            Redis Transfer
                        </button>
                        <button formaction="?/rapidPush" class="btn btn-green">
                            Rapid Seat Refresh
                        </button>
                    </div>
                </form>
                <!-- <button class="btn btn-green" onclick={() => {
                fetch("/api/server/refresh/ical")
            }}>
                API Test
            </button> -->
            </div>

            <div class="area area-std">
                <h2 class="text-lg font-bold mb-2">Information</h2>
                <h3 class="text-lg font-semibold">Term Codes</h3>
                <div class="space-y-1">
                    <!-- TODO FIX -->
                    {#each Object.keys(TERM_MAP).reverse() as term}
                        <div class="flex justify-between text-sm">
                            <span>
                                {TERM_MAP[parseInt(term)].name}
                            </span>
                            <span class="font-bold">{term}</span>
                        </div>
                    {/each}
                </div>
                <!-- * End Term Codes -->
                <h3 class="text-lg font-semibold mt-2">Notes</h3>
                <p class="text-sm">Evaluations are Fall 2020 and forward</p>
            </div>
            <!-- * End Information -->

            <div class="area area-std overflow-auto max-h-[600px]">
                <h2 class="text-lg font-bold mb-2">Statistics</h2>
                <div class="space-y-1">
                    <div class="flex justify-between text-sm">
                        <span>Total Users</span>
                        <span class="font-bold">{data.users}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span>Seen Popup</span>
                        <span class="font-bold">{data.seenCount}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span>Unresolved Feedback</span>
                        <span class="font-bold">{data.feedbackCount}</span>
                    </div>

                    {#if data.feedbackCount > 0}
                        <div class="space-y-1">
                            {#each data.feedback as feedback, i}
                                <div
                                    class="
                    bg-zinc-200 dark:bg-synth-medium p-2 rounded-md">
                                    <div
                                        class="text-sm max-h-48 overflow-y-auto">
                                        <span class="font-bold">#{i + 1}</span>
                                        {feedback.feedback}
                                    </div>
                                    <button
                                        class="btn btn-green mt-2 w-full"
                                        onclick={() =>
                                            resolveFeedback(feedback)}>
                                        Resolve
                                    </button>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            </div>
            <!-- * End Container -->
        </div>
    </div>
</main>

<style lang="postcss">
    .colored-container {
        @apply grid gap-2 text-sm;
        margin: 0 auto;
        grid-template-columns: 1fr;
    }

    .btn {
        @apply py-1 px-4 rounded-full duration-150 border-2 border-solid;
    }

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
        @apply p-4 rounded-lg border-[1px] border-zinc-200;
    }

    :global(.dark) .area {
        @apply border-zinc-700;
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
