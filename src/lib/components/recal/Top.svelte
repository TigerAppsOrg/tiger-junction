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
dark:text-white">
    <div class="justify-between flex">
        <div class="bg-zinc-100 dark:bg-zinc-800
         flex gap-2 w-fit p-1 h-8 mb-1">
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
        </div> <!-- * Semester Select -->

        <div class="flex gap-2">
            {#if $isMobile}
            <button on:click={() => $showCal = !$showCal}
                class="btn-circ text-zinc-600 dark:text-zinc-300
                flex items-center justify-center">
                    {#if $showCal}
                        ←
                    {:else}
                        →
                    {/if}
            </button>
            {/if}

            <button on:click={() => $darkTheme = !$darkTheme}
                class="btn-circ">
                    {#if $darkTheme}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
                    class="btn-icon">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                    </svg>                      
                    {:else}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
                    class="btn-icon">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                    </svg>                      
                    {/if}
            </button>
            
            <button class="btn-circ"
            on:click={() => modalStore.open("rcolors", { clear: true})}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
                class="btn-icon">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
                </svg>        
            </button>

            <button class="btn-circ"
            on:click={() => modalStore.open("exportCal", { clear: true})}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
                class="btn-icon">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>       
            </button>

            {#if !$isMobile}
                <button class="p-2 border-zinc-600/30 border-2 duration-150
                dark:border-zinc-200/60 h-8
                hover:bg-zinc-100 hover:border-zinc-600/40
                hover:dark:bg-zinc-700 hover:dark:border-zinc-200/90
                rounded-full flex items-center gap-2
                text-sm font-light text-zinc-600 dark:text-zinc-300"
                on:click={handleLogout}>
                    Logout
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
                    class="btn-icon">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                    </svg>                      
                </button>
            {:else}
                <button class="btn-circ"   
                on:click={handleLogout}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
                    class="btn-icon">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                    </svg>     
                </button>
            {/if}
        </div> <!-- * Icon Buttons -->
    </div>

    <div class="w-auto overflow-x-auto overflow-y-hidden">
    <div class="bg-zinc-100 dark:bg-zinc-800 flex gap-2 w-fit
    p-1 h-8 font-normal">
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
        <div class="h-6 relative pointer-events-none ml-[-25%] w-[150%]">
            <div id="duck" class="w-12 h-12 absolute bottom-[14px]">
                <img src={duck} alt="duck">
            </div>
        </div>
        {/if}
</div>

<style lang="postcss">
.card {
    @apply px-3 text-sm;
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

.btn-circ {
    @apply rounded-full p-1 border-zinc-600/30 border-2 duration-150
    dark:border-zinc-200/60 h-8 w-8;
}

.btn-circ:hover {
    @apply bg-zinc-100 border-zinc-600/40
    dark:bg-zinc-700 dark:border-zinc-200/90;
}

.btn-circ:active {
    @apply transform scale-95;
}

.btn-icon {
    @apply h-5 w-5 dark:text-zinc-300 text-zinc-500;
}

#duck {
    animation: animate-walk 30s infinite linear;
}

@keyframes animate-walk {
    0% {
        transform: tranzincX(0px);
    }
    100% {
        transform: tranzincX(150vw);
    }
}
</style>