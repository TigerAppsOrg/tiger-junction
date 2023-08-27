<script lang="ts">
import { fetchRawCourseData } from "$lib/scripts/ReCal+/fetchDb";
import { currentTerm } from "$lib/stores/recal";
import type { SupabaseClient } from "@supabase/supabase-js";
import customBlockIcon from "$lib/img/icons/customblockicon.svg";
import shareIcon from "$lib/img/icons/shareicon.svg";
import calendarIcon from "$lib/img/icons/calendaricon.svg";
import { modalStore } from "$lib/stores/modal";

export let supabase: SupabaseClient;

const handleTermChange = (term: number) => {
    currentTerm.set(term);
    fetchRawCourseData(supabase, term);
}

</script>

<div class="h-20 std-area mt-2 p-1">
    <div class="justify-between flex">
        <div class="bg-slate-100 dark:bg-slate-800
         flex gap-2 w-fit p-1 rounded-md h-8 mb-1">
            <button class="termchoice" class:selected={$currentTerm === 1232}
            on:click={() => handleTermChange(1232)}>
                Fall 2022
            </button>
            <button class="termchoice" class:selected={$currentTerm === 1234}
            on:click={() => handleTermChange(1234)}>
                Spring 2022
            </button>
            <button class="termchoice" class:selected={$currentTerm === 1242}
            on:click={() => handleTermChange(1242)}>
                Fall 2023
            </button>
        </div> <!-- * Semester Select -->
        <div class="flex gap-2">
            <button class="btn-circ"
            on:click={() => modalStore.open("shareCal", { clear: true})}>
                <img src={shareIcon} alt="Custom Block Icon"
                class="btn-icon">
            </button>
            <button class="btn-circ"
            on:click={() => modalStore.open("exportCal", { clear: true})}>
                <img src={calendarIcon} alt="Custom Block Icon"
                class="btn-icon">
            </button>
            <button class="btn-circ"
            on:click={() => modalStore.open("manageCb", { clear: true })}>
                <img src={customBlockIcon} alt="Custom Block Icon"
                class="btn-icon">
            </button>
        </div> <!-- * Icon Buttons -->
    </div>

    <div class="bg-slate-100 dark:bg-slate-800 flex gap-2 w-fit
    p-1 rounded-md h-8 font-light">
        <button class="termchoice">
            My Schedule
        </button>
    </div> <!-- * Schedule Select -->
</div>

<style lang="postcss">
.termchoice {
    @apply px-3 rounded-md text-sm;
}

.termchoice:hover {
    @apply bg-slate-200 dark:bg-slate-700;
}

.selected {
    @apply bg-gradient-to-r from-deepblue-light to-deepblue-dark text-white;
}

.btn-circ {
    @apply rounded-full p-1 border-slate-600/30 border-2 duration-150
    dark:border-slate-200/60 h-8 w-8;
}

.btn-circ:hover {
    @apply bg-slate-100 border-slate-600/40
    dark:bg-slate-700 dark:border-slate-200/90;
}

.btn-icon {
    @apply h-5 w-5 invert-[.5] dark:invert-[.7];
}
</style>