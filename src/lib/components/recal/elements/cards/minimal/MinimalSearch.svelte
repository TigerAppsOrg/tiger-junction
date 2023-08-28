<script lang="ts">
import type { CourseData } from "$lib/types/dbTypes";
import plusIcon from "$lib/img/icons/addicon.svg"
import pinIcon from "$lib/img/icons/pinicon.svg"
import { slide } from "svelte/transition";
import { pinCourseFromSearch, saveCourseFromSearch } from "$lib/scripts/ReCal+/cardFunctions";
import { searchSettings } from "$lib/stores/recal";
import { getLinks } from "$lib/scripts/ReCal+/getLinks";

export let course: CourseData;

// Course code with spaces before and after all slashes
let code = course.code.replace(/\//g, " / ");
let title = course.title;

const { registrar, tigersnatch, princetoncourses } = getLinks(course);

let color: string = "bg-slate-300 dark:bg-slate-500";
if (course.rating) {
    if (course.rating >= 4.5) color = "bg-green-400 dark:bg-green-700";
    else if (course.rating >= 4.0) color = "bg-blue-400 dark:bg-blue-700"
    else if (course.rating >= 3.5) color = "bg-yellow-400 dark:bg-yellow-700";
    else if (course.rating >= 3.0) color = "bg-orange-400 dark:bg-orange-700";
    else color = "bg-red-400 dark:bg-red-700";
}

let flipped: boolean = false;

</script>

<div id="card" transition:slide="{{ duration: 150, axis: "y" }}"
class="border-b-[1px] flex justify-between items-stretch duration-100
{$searchSettings.style["Color by Rating"] && color}">
    {#if !flipped}
    <button 
    class="text-sm font-light text-left w-[70%] dark:text-white p-1"
    on:click={() => flipped = true}>
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
        </button>

        <div class="w-[25%] flex justify-evenly">
            <button class="pin-button
            z-50 h-full w-full flex items-center justify-center
            duration-100"
            on:click={() => pinCourseFromSearch(course)}>
                <img src={pinIcon} alt="Pin" 
                class="w-6 h-6 invert-[.5] dark:invert-[.7]" />
            </button>
            <button class="add-button
            z-50 h-full w-full flex items-center justify-center
            duration-100"
            on:click={() => saveCourseFromSearch(course)}>
                <img src={plusIcon} alt="Add" 
                class="w-6 h-6 invert-[.5] dark:invert-[.7]" />
            </button>
        </div> 

    {:else}
    <div class="w-full">
        <button class="text-sm font-normal p-1 pb-2 w-full text-left"
        on:click={() => flipped = false}>
            {code}
        </button>
        <div id="buttons" class="w-full flex justify-evenly text-white">
            <a href={tigersnatch} target="_blank" 
            class="cardlink bg-orange-400 dark:bg-orange-700">
                <button class="btn variant-soft-warning cardbutton">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
                    class="icon">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>
            </a>

            <!-- Princeton Courses -->
            <a href={princetoncourses} target="_blank" 
            class="cardlink bg-blue-400 dark:bg-blue-700">
                <button class="btn variant-soft-tertiary cardbutton">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
                    class="icon">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                </button>
            </a>

            <!-- Registrar -->
            <a href={registrar} target="_blank" 
            class="cardlink bg-gray-400 dark:bg-gray-700">
                <button class="btn variant-soft-primary cardbutton">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
                    class="icon">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                    </svg>
                </button>
            </a>

            <div class="cardlink">
                <!-- Pin -->
                <button class="cardbutton bg-yellow-400 dark:bg-yellow-700" 
                on:click={() => pinCourseFromSearch(course)}>
                    <svg xmlns="http://www.w3.org/2000/svg" height="48" viewBox="0 -960 960 960" width="48"
                    class="icon invert">
                        <path d="m634-448 86 77v60H510v241l-30 30-30-30v-241H240v-60l80-77v-332h-50v-60h414v60h-50v332Zm-313 77h312l-59-55v-354H380v354l-59 55Zm156 0Z"/>
                    </svg>
                </button>
            </div>

            <div class="cardlink">
                <!-- Add -->
                <button class="cardbutton bg-green-400 dark:bg-green-700" 
                on:click={() => saveCourseFromSearch(course)}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
                    class="icon">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                </button>
            </div>

        </div> <!-- * End Buttons -->
    </div>
    {/if}  
</div>

<style lang="postcss">
#card:hover {
    @apply bg-slate-100 dark:bg-slate-700;
}

.add-button:hover {
    @apply bg-green-500 dark:bg-green-700;
}

.add-button:hover img {
    @apply invert;
}

.pin-button:hover {
    @apply bg-blue-500 dark:bg-blue-700;
}

.pin-button:hover img {
    @apply invert;
}

.cardlink {
    @apply w-1/5 m-0 px-0;  
}

.cardbutton {
    @apply px-0 h-10 w-full rounded-none;
}

.icon {
    @apply w-6 h-6 mx-auto;
}
</style>