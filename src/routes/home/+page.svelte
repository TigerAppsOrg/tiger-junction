<script lang="ts">
    import { onMount } from "svelte";
    import type { Course, Program } from "$lib/dbTypes";
    import Header from "$lib/components/Header.svelte";

    export let data;

    let courses: Course[] = [];
    let searchList: Course[] = [];

    let currentCourse: Course = { id: -1, name: "", term: "", registrar_id: "-1" };
    let currentMajors: Program[] = [];
    let currentCertificates: Program[] = [];

    let prevLength = 0;

    const normalize = (str: string) => str.toLowerCase().replace(/\s/g, "");

    const handleInput = (event: Event) => {
        const target = event.target as HTMLInputElement;
        const value = normalize(target.value);

        // If the input is less than 3 chars, show nothing
        if (value.length < 3) {
            prevLength = value.length;
            return;
        }

        // Show only crosslitings for 3 char inputs
        if (value.length === 3) {
            searchList = courses.filter(course => {
                let cross = course.name
                    .split(" ")[0]
                    .split("/")
                    .map(str => normalize(str.slice(0, 3)));
                return cross.includes(value);
            });
            prevLength = value.length;
            return;
        }

        // Standard search
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


<Header supabase={data.supabase} />
<div id="bento" class="flex gap-2">
    <div id="searchComplete" class="card">
        <div>
            <input type="text" placeholder="Enter a course"
            class="input input-bordered"
            on:input={handleInput}>
        </div>
        {#if prevLength > 2}
        <div class="flex flex-col border-2 ">
            {#each searchList as course}
                <button 
                on:click={() => handleCourseClick(course)} 
                class="">
                    {course.name}
                </button>
            {:else}
                <div>No courses found</div>
            {/each}
        </div>
        {/if}
    </div>
    
    <div id="results" class="card">
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
</div>

<style lang="postcss">
    .card {
        @apply bg-gray-200 rounded-xl p-4;
    }
</style>