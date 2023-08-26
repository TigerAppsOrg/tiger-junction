<script lang="ts">
import { getLinks } from "$lib/scripts/ReCal+/getLinks";
import type { CourseData } from "$lib/types/dbTypes";

export let course: CourseData;

const { registrar, tigersnatch, princetoncourses } = getLinks(course);

</script>

<div class="border-b-[1px] flex justify-between" 
id="cont">
    <div class="text-sm font-light dark:text-white w-[58%]">
        <div class="mb-[2px] font-normal">
            {course.code.replace(/\//g, " / ")}
        </div>
        <div class="font-light">
            {course.title}
        </div>
    </div> <!-- * End Content -->

    <div id="buttons" class="w-[40%] justify-evenly text-white">
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
            on:click={() => console.log("Pin")}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
                class="icon">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
            </button>
        </div>

        <div class="cardlink">
            <!-- Add -->
            <button class="cardbutton bg-green-400 dark:bg-green-700" 
            on:click={() => console.log("Add")}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
                class="icon">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
            </button>
        </div>

    </div> <!-- * End Buttons -->
</div>

<style lang="postcss">
.cardlink {
    @apply w-1/5 m-0 px-0;
}

.cardbutton {
    @apply px-0 h-full w-full rounded-none;
}

#cont #buttons {
    @apply hidden;
}

#cont:hover #buttons {
    @apply flex;
}

.icon {
    @apply lg:w-6 lg:h-6 w-4 h-4;
}
</style>