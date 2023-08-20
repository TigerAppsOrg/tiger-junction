<script lang="ts">
import { fly } from "svelte/transition";
import NavButton from "../elements/NavButton.svelte";

import homeIcon from "$lib/img/icons/homeicon.svg";
import calendarIcon from "$lib/img/icons/calendaricon.svg";
import lightbulbIcon from "$lib/img/icons/lightbulbicon.svg";
import treeIcon from "$lib/img/icons/treeicon.svg";
import settingsIcon from "$lib/img/icons/settingsicon.svg";
import lineIcon from "$lib/img/icons/subtractionicon.svg";

import IconLink from "../elements/IconLink.svelte";
import LightButton from "./LightButton.svelte";
import Icon from "../elements/Icon.svelte";

const TRANSITION_TIME = 1000;

export let currentApp: string;
export let show = false;


const toggleSidebar = () => {
    show = !show;
}

</script>

{#if show}
    <nav 
    class="top-0 left-0 h-full w-56
    bg-slate-300 dark:bg-synth-dark">
        <div class="flex flex-col justify-between items-center h-full">
            <div class="flex flex-col justify-start items-start w-full">

                <button class="bg-slate-300 dark:bg-slate-950
                w-full flex items-center justify-between h-12
                text-slate-800
                dark:text-slate-200 text-lg"
                on:click={toggleSidebar}>
                    <div class="flex justify-center items-center gap-1">
                        <img src="tjlogolarge.png" alt="Tiger Junction Logo"
                        class="w-12 h-12">
                        <span>TigerJunction</span>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
                    class="w-6 h-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12h-15m0 0l6.75 6.75M4.5 12l6.75-6.75" />
                    </svg>              
                </button>

                <div class="h-12 w-full 
                flex justify-start items-center text-slate-600
                dark:text-slate-400">
                    <LightButton />
                    <h2 class="text-lg font-light">
                        Toggle Dark Mode
                    </h2>
                </div>

                <div class="h-12 w-full pl-2 dark:text-slate-400
                text-slate-600 text-start flex items-end">
                    <h2>
                        APPS
                    </h2>
                </div>

                <NavButton href="/home" text="Home"
                src={homeIcon} alt="Home Icon"
                selected={currentApp === "home"}></NavButton>

                <NavButton href="/recalplus" text="ReCal+"
                src={calendarIcon} alt="ReCal+ Icon"
                selected={currentApp === "recalplus"}></NavButton>

                <NavButton href="/coursegenie" text="CourseGenie"
                src={lightbulbIcon} alt="CourseGenie Icon"
                selected={currentApp === "coursegenie"}></NavButton>

                <NavButton href="/reqtree" text="ReqTree"
                src={treeIcon} alt="ReqTree Icon"
                selected={currentApp === "reqtree"}></NavButton>
            </div> <!-- * End Top -->

            <div class="flex flex-col justify-end items-center w-full">
                <NavButton href="/settings" text="Settings"
                src={settingsIcon} alt="Settings Icon"
                selected={currentApp === "settings"} />    
            </div> <!-- * End Bottom -->
        </div>

    </nav>
{:else}
    <nav 
    class="top-0 left-0 h-full w-12 rounded-xl ml-2
    bg-slate-300 dark:bg-synth-dark overflow-hidden">
        <div class="flex flex-col justify-between items-center h-full">
            <div class="flex flex-col justify-start items-start w-full">

                <!-- * Site Utilities -->
                <button class="bg-slate-300 dark:bg-slate-950
                w-full flex items-center justify-center aspect-square"
                on:click={toggleSidebar}>
                    <img src="tjlogolarge.png" alt="Tiger Junction Logo"
                    class="w-12 h-12">
                </button>

                <LightButton />

                <!-- * App Nav -->
                <Icon src={lineIcon} alt="Horizontal Line" />

                <IconLink href="/home" 
                src={homeIcon} alt="Home Icon"
                selected={currentApp === "home"} />

                <!-- <Icon src={lineIcon} alt="Horizontal Line" /> -->

                <IconLink href="/recalplus"
                src={calendarIcon} alt="ReCal+ Icon"
                selected={currentApp === "recalplus"} />

                <IconLink href="/coursegenie" 
                src={lightbulbIcon} alt="CourseGenie Icon" 
                selected={currentApp === "coursegenie"} />

                <IconLink href="/reqtree" 
                src={treeIcon} alt="ReqTree Icon"
                selected={currentApp === "reqtree"} />
            </div> <!-- * End Top -->

            <div class="flex flex-col justify-end items-center w-full">
                <IconLink href="/settings" 
                src={settingsIcon} alt="Settings Icon"
                selected={currentApp === "settings"} />    
            </div> <!-- * End Bottom -->
        </div>       
    </nav>
{/if}