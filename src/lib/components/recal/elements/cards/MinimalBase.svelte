<script lang="ts">
import type { CourseData } from "$lib/types/dbTypes";
import plusIcon from "$lib/img/icons/addicon.svg"
import pinIcon from "$lib/img/icons/pinicon.svg"
import removeIcon from "$lib/img/icons/subtractionicon.svg"
import { slide } from "svelte/transition";
import { currentTerm, hoveredCourse, searchSettings } from "$lib/stores/recal";
import { getLinks } from "$lib/scripts/ReCal+/getLinks";
import * as cf from "$lib/scripts/ReCal+/cardFunctions";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sectionData } from "$lib/stores/rsections";

export let course: CourseData;
export let category: string = "search";
export let supabase: SupabaseClient;

// Course code with spaces before and after all slashes
let code = course.code.replace(/\//g, " / ");
let title = course.title;

const { registrar, tigersnatch, princetoncourses } = getLinks(course);

// Determine color of card
let color: string = "";

// Color by rating
if (category === "search" || category === "pinned") {
    if (!course.rating) color = "bg-slate-300 dark:bg-slate-500";
    else if (course.rating >= 4.5) color = "bg-green-400 dark:bg-green-700";
    else if (course.rating >= 4.0) color = "bg-blue-400 dark:bg-blue-700"
    else if (course.rating >= 3.5) color = "bg-yellow-400 dark:bg-yellow-700";
    else if (course.rating >= 3.0) color = "bg-orange-400 dark:bg-orange-700";
    else color = "bg-red-400 dark:bg-red-700";

// Dynamic color (saved courses)
} else {

    // ! Placeholder
    color = "bg-slate-300 dark:bg-slate-500";
}

let flipped: boolean = false;

const handleHover = async () => {
    // Measure time from start of function to end

    let start = performance.now();

    await sectionData.add(supabase, $currentTerm, course.id)

    let end = performance.now();
    console.log(end - start);
    console.log($sectionData);

    if (category === "search") {
        $hoveredCourse = course;
    }
    console.log($hoveredCourse);
}

const handleLeave = () => {
    if (category === "search") {
        $hoveredCourse = null;
    }
    console.log($hoveredCourse);
}

</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div id="card" transition:slide="{{ duration: 150, axis: "y" }}"
class="border-b-[1px] flex justify-between items-stretch duration-100
{$searchSettings.style["Color by Rating"] && color}" 
on:mouseenter={handleHover}
on:mouseleave={handleLeave}>
    {#if !flipped}
    <button 
    class="text-xs font-light text-left w-[75%] dark:text-white p-1"
    on:click={() => flipped = true}>
        <div class="font-normal">
            {code}
        </div>
        <div>
            {title}
        </div>
        {#if $searchSettings.style["Show Rating"]}
            <div class="text-xs italic font-light">
                Rating: {course.rating ? course.rating : "N/A"}
            </div>
        {/if}
        </button>

        <!-- TODO: Refactor, super messy! -->

        <div class="w-[20%] flex justify-evenly">
            {#if category === "saved"}
                <button class="pin-button
                z-50 h-full w-full flex items-center justify-center
                duration-100"
                on:click={() => cf.pinCourseFromSaved(supabase, course)}>
                    <img src={pinIcon} alt="Pin" 
                    class="ic" />
                </button>

                <button class="remove-button
                z-50 h-full w-full flex items-center justify-center
                duration-100"
                on:click={() => cf.removeCourseFromSaved(supabase, course)}>
                    <img src={removeIcon} alt="Remove" 
                    class="ic" />
                </button>

            {:else if category === "pinned"}

                <button class="add-button
                z-50 h-full w-full flex items-center justify-center
                duration-100"
                on:click={() => cf.saveCourseFromPinned(supabase, course)}>
                    <img src={plusIcon} alt="Save" 
                    class="ic" />
                </button>

                <button class="remove-button
                z-50 h-full w-full flex items-center justify-center
                duration-100"
                on:click={() => cf.removeCourseFromPinned(supabase, course)}>
                    <img src={removeIcon} alt="Remove" 
                    class="ic" />
                </button>

            {:else}
                <button class="pin-button
                z-50 h-full w-full flex items-center justify-center
                duration-100"
                on:click={() => cf.pinCourseFromSearch(supabase, course)}>
                    <img src={pinIcon} alt="Pin" 
                    class="ic" />
                </button>

                <button class="add-button
                z-50 h-full w-full flex items-center justify-center
                duration-100"
                on:click={() => cf.saveCourseFromSearch(supabase, course)}>
                    <img src={plusIcon} alt="Add" 
                    class="ic" />
                </button>
            {/if}
        </div> 

    {:else}
    <div class="w-full">
        <button class="text-xs font-normal p-1 pb-2 w-full text-left
        dark:text-white"
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
            class="cardlink bg-gray-400 dark:bg-gray-500">
                <button class="btn variant-soft-primary cardbutton">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
                    class="icon">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                    </svg>
                </button>
            </a>
        </div> <!-- * End Buttons -->
    </div>
    {/if}  
</div>

<style lang="postcss">
#card:hover {
    @apply bg-slate-100 dark:bg-slate-700;
}

/* !-- Refactor --! */

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

    .remove-button:hover {
        @apply bg-red-500 dark:bg-red-700;
    }

    .remove-button:hover img {
        @apply invert;
    }

/* !-- --! */

.cardlink {
    @apply w-1/3 m-0 px-0;  
}

.cardbutton {
    @apply px-0 h-10 w-full rounded-none;
}

.icon {
    @apply w-6 h-6 mx-auto;
}

.ic {
    @apply w-5 h-5 invert-[.5] dark:invert-[.7]
}
</style>