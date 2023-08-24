<script lang="ts">
import type { CourseData } from "$lib/types/dbTypes";

export let course: CourseData;

</script>

<div>
    <div>
        {course.code}: + {course.title}
    </div>
    <div>
        
    </div> <!-- * Buttons -->
</div>