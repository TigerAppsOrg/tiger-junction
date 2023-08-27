<script lang="ts">
import type { CourseData } from "$lib/types/dbTypes";
import infoIcon from "$lib/img/icons/infoicon.svg";
import { slide } from "svelte/transition";
    import { saveCourseFromSearch } from "$lib/scripts/ReCal+/cardFunctions";
    import { searchSettings } from "$lib/stores/recal";

export let course: CourseData;

// Course code with spaces before and after all slashes
let code = course.code.replace(/\//g, " / ");
let title = course.title;

let color: string = "";
if (course.rating) {
    if (course.rating >= 4.5) color = "bg-green-400 dark:bg-green-700";
    else if (course.rating >= 4.0) color = "bg-blue-400 dark:bg-blue-700"
    else if (course.rating >= 3.5) color = "bg-yellow-400 dark:bg-yellow-700";
    else if (course.rating >= 3.0) color = "bg-orange-400 dark:bg-orange-700";
    else color = "bg-red-400 dark:bg-red-700";
}

</script>

<button transition:slide="{{ duration: 150, axis: "y" }}"
class="border-b-[1px] p-1 flex items-center justify-between
{$searchSettings.style["Color by Rating"] && color}"
on:click={() => saveCourseFromSearch(course)}>
    <div class="text-sm font-light text-left w-[80%] dark:text-white">
        <div class="font-normal">
            {code}
        </div>
        <div>
            {title}
        </div>
        {#if $searchSettings.style["Show Rating"]}
            <div class="text-xs italic">
                Rating: {course.rating ? course.rating : "N/A"}
            </div>
        {/if}
    </div>
    <div class="w-[15%]">
        <button class="w-7 invert-[.4]">
            <img src={infoIcon} alt="Info Icon" class="btn-icon">
        </button>
    </div> <!-- * Buttons -->
</button>