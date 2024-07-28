<script lang="ts">
    import { currentSchedule, isResult, ready, recal } from "$lib/stores/recal";
    import CourseCard from "./elements/CourseCard.svelte";
    import { savedCourses } from "$lib/stores/rpool";
    import { calColors } from "$lib/stores/styles";
    import Loader from "$lib/components/ui/Loader.svelte";
    import { modalStore } from "$lib/stores/modal";

    $: saved = $savedCourses[$currentSchedule]
        ? $savedCourses[$currentSchedule].sort((a, b) =>
              a.code.localeCompare(b.code)
          )
        : [];

    $: colorChange = $calColors;
</script>

{#key saved && $recal}
    {#if saved && $ready}
        <div class="flex-1 flex flex-col overflow-y-hidden">
            <div
                class="text-base font-normal dark:text-zinc-100 ml-1
                    flex items-center justify-between">
                <span>
                    {saved.length} Saved
                    {saved.length === 1 ? "Course" : "Courses"}
                </span>
                <button
                    on:click={() => modalStore.push("exportCal")}
                    class="flex items-center gap-[1px] text-sm">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        class="w-5 h-5 calbut">
                        <path
                            fill-rule="evenodd"
                            d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z"
                            clip-rule="evenodd" />
                    </svg>

                    <p class="calbut">Export</p>
                </button>
            </div>

            {#if saved.length > 0}
                <div class="flex flex-col rounded-sm flex-1 overflow-y-hidden">
                    <div class="overflow-y-auto">
                        {#key saved && colorChange}
                            {#each saved as course}
                                <CourseCard {course} category="saved" />
                            {/each}
                        {/key}
                    </div>
                </div>
            {/if}
        </div>
    {:else}
        <div class="flex items-center gap-2 mt-2">
            <Loader />
            <span> Loading... </span>
        </div>
    {/if}
{/key}

<style lang="postcss">
    .calbut {
        @apply dark:text-zinc-100;
    }

    .calbut:hover {
        @apply text-zinc-600 duration-150 dark:text-zinc-300;
    }
</style>
