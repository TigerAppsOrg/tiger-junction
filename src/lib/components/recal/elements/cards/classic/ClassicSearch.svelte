<script lang="ts">
import type { CourseData } from "$lib/types/dbTypes";

export let course: CourseData;

// Course code with spaces before and after all slashes
let code = course.code.replace(/\//g, " / ");
let title = course.title;

</script>

<div class="border-b-[1px]">
    <div class="text-sm font-light">
        <div>
            {code}
        </div>
        <div>
            {title}
        </div>
    </div>
    <div>
        
    </div> <!-- * Buttons -->
</div>