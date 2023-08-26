<script lang="ts">
import type { CourseData } from "$lib/types/dbTypes";
import infoIcon from "$lib/img/icons/infoicon.svg";
    import { slide } from "svelte/transition";

export let course: CourseData;

// Course code with spaces before and after all slashes
let code = course.code.replace(/\//g, " / ");
let title = course.title;

</script>

<button transition:slide="{{ duration: 150, axis: "y" }}"
class="border-b-[1px] p-1 flex items-center">
    <div class="text-sm font-light text-left w-[80%]">
        <div>
            {code}
        </div>
        <div>
            {title}
        </div>
    </div>
    <div class="w-[20%]">
        <button class="w-7 invert-[.4]">
            <img src={infoIcon} alt="Info Icon" class="btn-icon">
        </button>
    </div> <!-- * Buttons -->
</button>