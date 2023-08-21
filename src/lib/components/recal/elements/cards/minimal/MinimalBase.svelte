<script lang="ts">
import { fly } from "svelte/transition";

</script>

<!--?------------------------------------------------------------------>

<div transition:fly="{{ duration: 300, x: -150}}"
class="text-sm p-1 mb-1 cursor-pointer relative duration-150">
    <div class="w-[85%] bg-red-500">
        <p class="mb-[2px] font-normal">
            
        </p>
        <p class="font-light">
            
        </p>
    </div>

    <button class="btn btn-icon absolute right-0 top-0 bottom-0 m-auto 
    mr-2 hover:variant-filled-surface">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
        class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
        </svg>
    </button>
</div>

    
            