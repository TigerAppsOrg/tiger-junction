<script lang="ts">
    
</script>



<div id="bento" class="flex gap-2 h-screen pt-20 pb-4 px-4">
    <!-- <div id="searchComplete" class="card w-1/3">
        <div>
            <input type="text" placeholder="Enter a course"
            class="w-full rounded-lg p-2 border-none mb-2"
            on:input={handleInput}>
        </div>
        {#if prevLength > 2}
        <div class="flex flex-col border-2 max-h-[80vh] overflow-scroll 
        text-left space-y-1">
            {#each searchList as course}
                <button 
                class="bg-secondary rounded-lg">
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
    </div> -->
</div>

<style lang="postcss">
    .card {
        @apply bg-gray-200 rounded-xl p-4;
    }
</style>