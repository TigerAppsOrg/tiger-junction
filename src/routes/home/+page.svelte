<script lang="ts">
    import { onMount } from "svelte";
    import type { Course, Program } from "$lib/dbTypes";

    let courses: Course[] = [];
    let searchList: Course[] = [];

    let currentCourse: Course = { id: 0, name: "" };
    let currentMajors: Program[] = [];
    let currentCertificates: Program[] = [];

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
        let rawPrograms = await fetch("/api/search/course?id=1");
        let programs: Program[] = await rawPrograms.json();

        currentMajors = programs.filter(program => 
            program.category === "major");
        currentCertificates = programs.filter(program => 
            program.category === "certificate");

        currentCourse = course;        
    }

    onMount(async () => {
        let raw = await fetch("/api/list/courses");
        courses = await raw.json();
        searchList = [...courses];
    });
</script>

<div id="searchComplete">
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

{#if currentCourse.name !== ""}
<div id="results" class="bg-sky-500">
    <div>
        <h3>{currentCourse.name}</h3>
    </div>
    <div>
        <h4>Majors</h4>
        {#each currentMajors as major}
            <div>{major.name}</div>
        {:else}
            <div>No majors</div>
        {/each}
    </div>
    <div>
        <h4>Certificates</h4>
        {#each currentCertificates as certificate}
            <div>{certificate.name}</div>
        {:else}
            <div>No certificates</div>
        {/each}
    </div>
</div>
{/if}