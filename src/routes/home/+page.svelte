<script lang="ts">
    import { onMount } from "svelte";
    import type { Course } from "$lib/dbTypes";

    let courses: Course[] = [];
    let searchList: Course[] = [];

    let currentCourse: Course = { id: 0, name: "" };
    let currentCertificates: string[] = [];
    let currentMajors: string[] = [];

    let prevLength = 0;

    const normalize = (str: string) => str.toLowerCase().replace(/\s/g, "");

    const handleInput = (event: Event) => {
        const target = event.target as HTMLInputElement;
        const value = normalize(target.value);

        if (value.length > prevLength) 
            searchList = searchList.filter(course => 
            normalize(course.name).includes(value));
        else
            searchList = courses.filter(course => 
            normalize(course.name).includes(value));
        
        prevLength = value.length;
    }

    const handleCourseClick = async (course: Course) => {
        currentCourse = course;        

    }

    onMount(async () => {
        let raw = await fetch("/api/list/courses");
        courses = await raw.json();
        searchList = [...courses];
    });
</script>

<div>
    <div>
        <input type="text" placeholder="Enter a course"
        class="input input-bordered"
        on:input={handleInput}>
    </div>
    <div class="flex flex-col border-2 border-red-500">
        {#each searchList as course}
            <button 
            on:click={() => handleCourseClick(course)} 
            class="bg-blue-200 border-2 border-red-500">
                {course.name}
            </button>
        {:else}
            <div>No courses found</div>
        {/each}
    </div>
</div>