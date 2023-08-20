<script lang="ts">

</script>


<div class="h-full p-2">
    <div class="bg-white dark:bg-synth-light 
    dark:text-slate-200 h-full w-full rounded-xl overflow-hidden
    border-2 border-slate-600/30 dark:border-slate-200/30">
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
    </div>
</div>

<style lang="postcsss">

</style>