<script lang="ts">
import { fetchRawCourseData, fetchUserSchedules, populatePools } from "$lib/scripts/ReCal+/fetchDb";
import { currentSchedule, currentTerm, rawCourseData, ready, retop, schedules, searchCourseData } from "$lib/stores/recal";
import type { SupabaseClient } from "@supabase/supabase-js";

import customBlockIcon from "$lib/img/icons/customblockicon.svg";
// import shareIcon from "$lib/img/icons/shareicon.svg";
import paletteIcon from "$lib/img/icons/paletteicon.svg";
import pinIcon from "$lib/img/icons/pinicon.svg";
import addIcon from "$lib/img/icons/addicon.svg";
import calendarIcon from "$lib/img/icons/calendaricon.svg";
import editIcon from "$lib/img/icons/editicon.svg"
import logoutIcon from "$lib/img/icons/logouticon.svg";
import moonIcon from "$lib/img/icons/moonicon.svg";
import sunIcon from "$lib/img/icons/sunicon.svg";

import { darkTheme } from "$lib/stores/state";
import { modalStore } from "$lib/stores/modal";
import { goto } from "$app/navigation";
import Loader from "../elements/Loader.svelte";
import { pinnedCourses, savedCourses } from "$lib/stores/rpool";
import { isMobile, showCal } from "$lib/stores/mobile";
import { calColors } from "$lib/stores/styles";
    import { toastStore } from "$lib/stores/toast";

export let supabase: SupabaseClient;

// $: isMobile = window.innerWidth < 768;

const handleTermChange = async (term: number) => {
    $ready = false;
    currentTerm.set(term);
    await fetchRawCourseData(supabase, term);
    await fetchUserSchedules(supabase, term);
    await populatePools(supabase, term);
    
    if ($schedules[term].length > 0)
        currentSchedule.set($schedules[term][0].id);

    $ready = true;
}

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

</script>

<div class="h-20 max-h-[15vh] std-area mt-2 p-1">
    <div class="justify-between flex">
        <div class="bg-slate-100 dark:bg-slate-800
         flex gap-2 w-fit p-1 rounded-md h-8 mb-1">
            <button class="termchoice" 
            class:selected={$currentTerm === 1232}
            on:click={() => handleTermChange(1232)}>
                {#if $isMobile}
                F22
                {:else}
                Fall 2022
                {/if}
            </button>
            <button class="termchoice" 
            class:selected={$currentTerm === 1234}
            on:click={() => handleTermChange(1234)}>
                {#if $isMobile}
                S23
                {:else}
                Spring 2023
                {/if}
            </button>
            <button class="termchoice" 
            class:selected={$currentTerm === 1242}
            on:click={() => handleTermChange(1242)}>
                {#if $isMobile}
                F23
                {:else}
                Fall 2023
                {/if}
            </button>
        </div> <!-- * Semester Select -->

        <div class="flex gap-2">
            {#if $isMobile}
            <button on:click={() => $showCal = !$showCal}
                class="btn-circ text-slate-600 dark:text-slate-300
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
                        <img src={moonIcon} alt="Dark Mode Icon" 
                        class="btn-icon">
                    {:else}
                        <img src={sunIcon} alt="Light Mode Icon" 
                        class="btn-icon">
                    {/if}
            </button>
            <!-- <button class="btn-circ"
            on:click={() => modalStore.open("shareCal", { clear: true})}>
                <img src={shareIcon} alt="Custom Block Icon"
                class="btn-icon">
            </button> -->
            <button class="btn-circ"
            on:click={() => modalStore.open("pinned", { clear: true})}>
                <img src={pinIcon} alt="Pin Icon"
                class="btn-icon">
            </button>
            <button class="btn-circ"
            on:click={() => modalStore.open("rcolors", { clear: true})}>
                <img src={paletteIcon} alt="Palette Icon"
                class="btn-icon">
            </button>
            <!-- <button class="btn-circ"
            on:click={() => toastStore.add("info", "Awooga")}>
                <img src={calendarIcon} alt="Custom Block Icon"
                class="btn-icon">
            </button> -->
            <!-- <button class="btn-circ"
            on:click={() => console.log($toastStore)}>
                <img src={customBlockIcon} alt="Custom Block Icon"
                class="btn-icon">
            </button> -->
            <button class="btn-circ"
            on:click={handleLogout}>
                <img src={logoutIcon} alt="Logout Icon"
                class="btn-icon">
            </button>
        </div> <!-- * Icon Buttons -->
    </div>

    <div class="bg-slate-100 dark:bg-slate-800 flex gap-2 w-fit
    p-1 rounded-md h-8 font-light">
    {#key $retop}
        {#await fetchUserSchedules(supabase, $currentTerm)}
            <Loader />
        {:then}
            {#key $schedules[$currentTerm]}
            {#each $schedules[$currentTerm] as schedule}

            {#if $currentSchedule === schedule.id}
                <button class="termchoice flex items-center gap-2" 
                class:selected={$currentSchedule === schedule.id}
                on:click={() => 
                modalStore.open("editSchedule", { clear: true })}>
                    <span>{schedule.title}</span>
                    <img src={editIcon} alt="Edit Icon" 
                    class="w-4 h-4 invert">
                </button>
            {:else}
                <button class="termchoice" 
                class:selected={$currentSchedule === schedule.id}
                on:click={() => handleScheduleChange(schedule.id)}>
                    {schedule.title}
                </button>
            {/if}

            {/each}
                <button class="termchoice"
                on:click={() => 
                modalStore.open("addSchedule", { clear: true })}>
                    <img src={addIcon} alt="Add Icon"
                    class="btn-icon">
                </button>
            {/key}
        {:catch error}
            <button class="termchoice"
            on:click={() => 
            modalStore.open("addSchedule", { clear: true })}>
                <img src={addIcon} alt="Add Icon"
                class="btn-icon">
            </button>
        {/await}
    {/key}
    </div> <!-- * Schedule Select -->
</div>

<style lang="postcss">
.termchoice {
    @apply px-3 rounded-md text-sm;
}

.termchoice:hover {
    @apply bg-slate-200 dark:bg-slate-700;
}

.selected {
    @apply bg-gradient-to-r from-deepblue-light to-deepblue-dark
    text-white;
}

.btn-circ {
    @apply rounded-full p-1 border-slate-600/30 border-2 duration-150
    dark:border-slate-200/60 h-8 w-8;
}

.btn-circ:hover {
    @apply bg-slate-100 border-slate-600/40
    dark:bg-slate-700 dark:border-slate-200/90;
}

.btn-icon {
    @apply h-5 w-5 invert-[.5] dark:invert-[.7];
}
</style>