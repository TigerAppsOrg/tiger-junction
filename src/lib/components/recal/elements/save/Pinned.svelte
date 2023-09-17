<script lang="ts">
import { currentSchedule, searchSettings } from "$lib/stores/recal";
import type { SupabaseClient } from "@supabase/supabase-js";
import ClassicSearch from "../cards/ClassicSearch.svelte";
import MinimalBase from "../cards/MinimalBase.svelte";
import { pinnedCourses } from "$lib/stores/rpool";
import Modal from "$lib/components/elements/Modal.svelte";
import { modalStore } from "$lib/stores/modal";

export let supabase: SupabaseClient;
export let showModal: boolean = false;

$: pinned = $pinnedCourses[$currentSchedule];
</script>


<Modal {showModal} >
{#if pinned}
<div class="p-6 w-[80vw] max-w-2xl">
    <div class="text-base font-normal dark:text-white ml-1">
        {pinned.length} Pinned 
        {pinned.length === 1 ? "Course" : "Courses"}
    </div> <!-- * End Head -->

    {#if pinned.length > 0}
    <div class="flex flex-col overflow-hidden border-2 rounded-xl 
    max-h-[30vh]">
        <div class="overflow-y-auto">
            {#key pinned}
            {#each pinned as course}
                {#if $searchSettings.style["Original Style"]}
                    <ClassicSearch {course} />
                {:else}
                    <MinimalBase {supabase} {course} category="pinned" />
                {/if}
            {/each}
            {/key}
        </div>
    </div> <!-- * End Results -->
    {/if}

    <div class="flex gap-2 border-t-2 mt-2 pt-2">
        <!-- <button class="btn border-2 border-slate-600/30 flex-1" 
        on:click={() => modalStore.close()}>
            Cancel
        </button> -->
        <button class="btn flex-1 bg-gradient-to-r 
        from-deepblue-light to-deepblue-dark text-white"
        on:click={() => modalStore.close()}>
            Close
        </button>
    </div> <!-- * End Nav -->
</div>
{/if}
</Modal>

<style lang="postcss">
.btn {
    @apply rounded-md py-2 text-center;
}
</style>