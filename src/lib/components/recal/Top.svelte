<script lang="ts">
import { fetchRawCourseData, fetchUserSchedules, populatePools } from "$lib/scripts/ReCal+/fetchDb";
import { currentSchedule, ready, retop, searchCourseData, searchSettings } from "$lib/stores/recal";
import { currentTerm, schedules } from "$lib/changeme";
import type { SupabaseClient } from "@supabase/supabase-js";
import duck from "$lib/img/duck.gif";

import { modalStore } from "$lib/stores/modal";
import { goto } from "$app/navigation";
import Loader from "../elements/Loader.svelte";
import { savedCourses } from "$lib/stores/rpool";
import { isMobile, showCal } from "$lib/stores/mobile";
import { toastStore } from "$lib/stores/toast";
import { SCHEDULE_CAP } from "$lib/constants";
import { calColors, calculateCssVars } from "$lib/stores/styles";
import { ACTIVE_TERMS } from "$lib/changeme";
    import confetti from "canvas-confetti";

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

    let courses = [...$savedCourses[scheduleId]];
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

const invokeFun = () => {
    var count = 200;
    var defaults = {
        origin: { y: 0.7 }
    };

    function fire(particleRatio: number, opts: any) {
        confetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio)
        });
    }

    fire(0.25, {
        spread: 26,
        startVelocity: 55,
    });
    fire(0.2, {
        spread: 60,
    });
    fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8
    });
    fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2
    });
    fire(0.1, {
        spread: 120,
        startVelocity: 45,
    });
}


// Handle theme changes
$: cssVarStyles = calculateCssVars("0", $calColors);
</script>

<div style={cssVarStyles} id="parent"
class="h-20 px-1 overflow-clip text-zinc-900
dark:text-zinc-100 text-sm">
    <div class="justify-between flex">
        <div class="bg-zinc-100 dark:bg-zinc-800
         flex gap-2 w-fit p-1 h-8 mb-1 rounded-sm">
            {#each Object.keys(ACTIVE_TERMS).map(x => parseInt(x)) as activeTerm}
                <button class="card 
                {$currentTerm === activeTerm ? "" : "termchoice"}" 
                class:selected={$currentTerm === activeTerm}
                on:click={() => handleTermChange(activeTerm)}>
                    {#if $isMobile}
                    {ACTIVE_TERMS[activeTerm].mobile_name}
                    {:else}
                    {ACTIVE_TERMS[activeTerm].name}
                    {/if}
                </button>
            {/each}
        </div> 

        <div class="flex gap-2">
            {#if $isMobile}
            <button on:click={() => $showCal = !$showCal}
                class="h-6 w-20 bg-zinc-100 rounded-sm 
                hover:text-zinc-600
                dark:bg-zinc-800
                 dark:text-zinc-100 hover:dark:text-zinc-300
                flex items-center justify-center">
                    {#if $showCal}
                        ← List
                    {:else}
                        → Calendar
                    {/if}
            </button>
            {/if}
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
        <div class="h-6 relative cursor-default ml-[-10%] w-[120%]">
            <button on:click={invokeFun}
            id="duck" class="w-12 h-12 absolute bottom-[6px] cursor-default">
                <img src={duck} alt="duck">
            </button>
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