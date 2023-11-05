<script lang="ts">
import settingsIcon from "$lib/img/icons/settingsicon.svg";
import { modalStore } from "$lib/stores/modal";
import { searchSettings, searchResults, currentTerm, searchCourseData, currentSchedule, isResult, hoveredCourse, research, ready, rawCourseData } from "$lib/stores/recal";
import { rMeta } from "$lib/stores/rmeta";
import { sectionData } from "$lib/stores/rsections";
    import { toastStore } from "$lib/stores/toast";
    import type { RawCourseData } from "$lib/types/dbTypes";
import type { SupabaseClient } from "@supabase/supabase-js";

export let supabase: SupabaseClient;

let inputBar: HTMLInputElement;

// Number of results, under which sections are added automatically
const THRESHOLD = 20;

// Update search results when params change
$: autoTrig($searchSettings, $searchCourseData, $currentTerm,
 $currentSchedule, $research, $rMeta);
const autoTrig = (...params: any[]) => {
    triggerSearch();
}

const triggerSearch = () => {
    if (!inputBar || inputBar.value === undefined) return;
    searchResults.search(inputBar.value, $currentTerm, $searchSettings);

    // Load instructors
    if ($searchSettings.style["Show Instructor(s)"]) {
        for (let i = 0; i < $searchResults.length; i++) {
            let course = $searchResults[i];
            if (course.instructors === null || course.instructors === undefined) {
                supabase.from("course_instructor_associations")
                    .select("instructors (name)")
                    .eq("course_id", course.id)
                    .then(({ data, error }) => {
                        if (error) console.log(error);
                        else {
                            let instructors = data.map(x => x.instructors).map((x: any) => x.name);
                            // Update rawCourseData
                            rawCourseData.update(x => {
                                let entry = x[$currentTerm as keyof RawCourseData].find(x => x.id === course.id);
                                if (entry) entry.instructors = instructors;
                                return x;
                            });

                            // Update searchCourseData
                            searchCourseData.update(x => {
                                let entry = x[$currentTerm as keyof RawCourseData].find(x => x.id === course.id);
                                if (entry) entry.instructors = instructors;
                                return x;
                            });
                        }
                    })
            }
        }
    }
    
    // Handle isResult flag
    if ($searchResults.length > 0) isResult.set(true);
    else {
        isResult.set(false);
        hoveredCourse.set(null);   
    }

    // If results are less than threshold, add sections
    if ($searchResults.length < THRESHOLD) 
        for (let i = 0; i < $searchResults.length; i++)
            sectionData.add(supabase, $currentTerm, $searchResults[i].id);
}
</script>

<div>
    <div class="flex gap-2">
        <input type="text" placeholder="Search" 
        class="search-input std-area" bind:this={inputBar}
        on:input={triggerSearch}>
        <button class="adv-search"
        on:click={() => {
            if (!$ready) toastStore.add("error", "Please wait for the data to load");
            else modalStore.open("adv", { clear: true });
        }}>
            <img src={settingsIcon} alt="Settings Icon" 
            class="w-6 h-6 dark:invert-[.7] invert-[.5]">
        </button>
    </div>
</div>

<style lang="postcss">
.search-input {
    @apply flex-1 p-2 h-10 w-20;
}

.adv-search {
  @apply h-10 w-10 flex justify-center items-center duration-150
    border-slate-600/30 border-2 dark:border-slate-200/60
    hover:bg-slate-100 dark:hover:bg-slate-800;
    border-radius: 50%;
}

.adv-search:hover {
    animation: rainbow-border 2s linear infinite;
}

@keyframes rainbow-border {
  0% {
    border-image-slice: 1;
    transform: rotate(0deg);
  }
  100% {
    border-image-slice: 8;
    transform: rotate(360deg);
  }
}
</style>