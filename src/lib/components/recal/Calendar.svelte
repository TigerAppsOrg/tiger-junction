<script lang="ts">
import type { SupabaseClient } from "@supabase/supabase-js";

export let supabase: SupabaseClient;
</script>


<div class="h-full">
    <div class="h-full w-full std-area">
        <div class="grid grid-cols-5 w-full h-[4%] text-center 
        font-semibold">
            {#each ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as day}
                <div class="outline outline-[1px] outline-slate-600/30
                dark:outline-slate-200/30 flex justify-center 
                items-center text-sm">{day}</div>
            {/each}
        </div>
        
        <!-- Grid Lines -->
        <div class="grid grid-cols-5 w-full h-[96%]">
            {#each {length: 75} as _}
                <div class="outline outline-[1px] outline-slate-600/30
                dark:outline-slate-200/30"></div>
            {/each}
        </div>

        <!-- CalBoxes-->
        
        
    </div>
</div>

<style lang="postcsss">

</style>