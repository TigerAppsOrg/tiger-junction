<script lang="ts">
import { fetchRawCourseData } from "$lib/scripts/ReCal+/fetchRawCourse";
import { currentTerm } from "$lib/stores/recal";
import type { SupabaseClient } from "@supabase/supabase-js";
import customBlockIcon from "$lib/img/icons/customblockicon.svg";
import shareIcon from "$lib/img/icons/shareicon.svg";
import customizeIcon from "$lib/img/icons/paletteicon.svg";
import calendarIcon from "$lib/img/icons/calendaricon.svg";
    import { modalStore } from "$lib/stores/modal";

export let supabase: SupabaseClient;

const handleTermChange = (term: number) => {
    currentTerm.set(term);
    fetchRawCourseData(supabase, term).then((res) => {
        console.log(res);
    });
}

</script>

<div class="h-16 std-area mt-2 flex justify-between p-2">
    <div class="bg-slate-100 flex gap-2 w-fit p-2 rounded-md">
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


<style lang="postcss">
.termchoice {
    @apply px-3 rounded-md;
}

.termchoice:hover {
    @apply bg-slate-200;
}

.selected {
    @apply bg-gradient-to-r from-blue-500 to-purple-500 text-white;
}

.btn-circ {
    @apply rounded-full p-2 border-slate-600/30 border-2 duration-150;
}

.btn-circ:hover {
    @apply bg-slate-100 border-slate-600/40;
}

.btn-icon {
    @apply h-6 w-6 invert-[.5];
}
</style>