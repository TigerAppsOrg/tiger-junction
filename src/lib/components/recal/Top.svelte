<script lang="ts">
import { fetchRawCourseData, fetchUserSchedules, populatePools } from "$lib/scripts/ReCal+/fetchDb";
import { currentSchedule, currentTerm, ready, retop, schedules, searchCourseData, searchSettings } from "$lib/stores/recal";
import type { SupabaseClient } from "@supabase/supabase-js";
import duck from "$lib/img/duck.gif";

import { darkTheme } from "$lib/stores/state";
import { modalStore } from "$lib/stores/modal";
import { goto } from "$app/navigation";
import Loader from "../elements/Loader.svelte";
import { pinnedCourses, savedCourses } from "$lib/stores/rpool";
import { isMobile, showCal } from "$lib/stores/mobile";
import { toastStore } from "$lib/stores/toast";
import { SCHEDULE_CAP } from "$lib/constants";
import { calColors, calculateCssVars } from "$lib/stores/styles";

export let supabase: SupabaseClient;

// Change the current term
const handleTermChange = async (term: number) => {
    $ready = false;
    currentTerm.set(term);
    await fetchRawCourseData(supabase, term);
    await fetchUserSchedules(supabase, term);
    await populatePools(supabase, term);
    
    if ($schedules[term].length > 0 && term === $currentTerm) {
        currentSchedule.set($schedules[term][0].id);
    }
        
    $ready = true;
}

// Change the current schedule
const handleScheduleChange = (scheduleId: number) => {
    currentSchedule.set(scheduleId);
    searchCourseData.reset($currentTerm);

    let courses = [...$savedCourses[scheduleId], ...$pinnedCourses[scheduleId]];
    searchCourseData.remove($currentTerm, courses);
}

// Logout the user
const handleLogout = async () => { 
    const { error } = await supabase.auth.signOut();
    if (!error) {
        toastStore.add("success", "Logged out successfully");
        goto("/");
    }
}

// Add a new schedule if user has less than 10 schedules
const handleAddSchedule = () => {
    // Check if user has more than 10 schedules (max)
    if ($schedules[$currentTerm].length >= SCHEDULE_CAP) {
        toastStore.add("error", "Maximum number of schedules reached");
        return;
    }

    modalStore.open("addSchedule", { clear: true });
}

// Handle theme changes
$: cssVarStyles = calculateCssVars("0", $calColors);
</script>

<div style={cssVarStyles} id="parent"
class="h-20 px-1 overflow-clip  text-zinc-900
dark:text-zinc-100 text-sm">
    <div class="justify-between flex">
        <div class="bg-zinc-100 dark:bg-zinc-800
         flex gap-2 w-fit p-1 h-8 mb-1 rounded-sm">
            <button class="card {$currentTerm === 1234 ? "" : "termchoice"}" 
            class:selected={$currentTerm === 1234}
            on:click={() => handleTermChange(1234)}>
                {#if $isMobile}
                S23
                {:else}
                Spring 2023
                {/if}
            </button>
            <button class="card {$currentTerm === 1242 ? "" : "termchoice"}" 
            class:selected={$currentTerm === 1242}
            on:click={() => handleTermChange(1242)}>
                {#if $isMobile}
                F23
                {:else}
                Fall 2023
                {/if}
            </button>
            <button class="card {$currentTerm === 1244 ? "" : "termchoice"}" 
            class:selected={$currentTerm === 1244}
            on:click={() => handleTermChange(1244)}>
                {#if $isMobile}
                S24
                {:else}
                Spring 2024
                {/if}
            </button>
        </div> 
    </div>

    <div class="w-auto overflow-x-auto overflow-y-hidden">
    <div class="bg-zinc-100 dark:bg-zinc-800 flex gap-2 w-fit
    p-1 h-8 font-normal rounded-sm">
    {#key $retop}
        {#await fetchUserSchedules(supabase, $currentTerm)}
            <Loader />
        {:then}
            {#key $schedules[$currentTerm]}
            {#each $schedules[$currentTerm] as schedule}

            {#if $currentSchedule === schedule.id}
                <button class="flex items-center gap-4 card
                {$currentSchedule === schedule.id ? "" : "termchoice"}" 
                class:selected={$currentSchedule === schedule.id}
                on:click={() => 
                modalStore.open("editSchedule", { clear: true })}>
                    <span class="whitespace-nowrap">{schedule.title}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" 
                    stroke="currentColor" class="w-4 h-4 mr-2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                    </svg>                      
                </button>
            {:else}
                <button class="card termchoice" 
                on:click={() => handleScheduleChange(schedule.id)}>
                    <span class="whitespace-nowrap">
                        {schedule.title}
                    </span>
                </button>
            {/if}

            {/each}
                <button class="card termchoice"
                on:click={handleAddSchedule}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
                    class="h-5 w-5 dark:text-zinc-300 text-zinc-500">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                </button>
            {/key}
        {:catch error}
            <button class="card termchoice"
            on:click={() => 
            modalStore.open("addSchedule", { clear: true })}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="btn-icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>  
            </button>
        {/await}
    {/key}
    </div> 
    </div> <!-- * Schedule Select -->
    
        {#if $searchSettings.style["Duck"]}
        <!-- https://en.m.wikipedia.org/wiki/File:Cartoon_steamer_duck_walking_animation.gif -->
        <div class="h-6 relative pointer-events-none ml-[-10%] w-[120%]">
            <div id="duck" class="w-12 h-12 absolute bottom-[6px]">
                <img src={duck} alt="duck">
            </div>
        </div>
        {/if}
</div>

<style lang="postcss">
.card {
    @apply px-3 text-sm rounded-sm;
}

.card:active {
    @apply transform scale-95;
}

.termchoice:hover {
    @apply bg-zinc-200 dark:bg-zinc-700 duration-150;
}

.selected {
    background-color: var(--bg);
    color: var(--text);
    transition-duration: 150ms;
}

.selected:hover {
    background-color: var(--bg-hover);
}

.btn-icon {
    @apply h-5 w-5 dark:text-zinc-300 text-zinc-500;
}

#duck {
    animation: animate-walk 30s infinite linear;
}

@keyframes animate-walk {
    0% {
        transform: translateX(0px);
    }
    100% {
        transform: translateX(150vw);
    }
}
</style>