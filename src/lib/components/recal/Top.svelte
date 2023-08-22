<script lang="ts">
import { fetchRawCourseData } from "$lib/scripts/ReCal+/fetchRawCourse";
import { currentTerm } from "$lib/stores/recal";
import type { SupabaseClient } from "@supabase/supabase-js";

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
    <div>
        
    </div> <!-- * Custom Block Management -->
</div>


<style lang="postcss">
.termchoice {
    @apply px-3 rounded-md;
}

.selected {
    @apply bg-gradient-to-r from-blue-500 to-purple-500 text-white;
}
</style>