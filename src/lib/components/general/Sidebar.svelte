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


export let currentApp: string;
export let show = false;

const toggleSidebar = () => {
    show = !show;
}

</script>

{#if show}
    <nav transition:fly={{ x: -250, opacity: 1 }}
    class="fixed top-0 left-0 h-full w-40 bg-white">
        
        <NavButton>
            <span slot="icon">
                !
            </span>
            <span slot="text">
                ReCal+
            </span>
        </NavButton>
        <NavButton>
            <span slot="icon">
                !
            </span>
            <span slot="text">
                ReCal+
            </span>
        </NavButton>
        <NavButton>
            <span slot="icon">
                !
            </span>
            <span slot="text">
                ReCal+
            </span>
        </NavButton>

    </nav>
{:else}
    <div transition:fly={{ x: -250, opacity: 1 }}
    class="fixed top-0 left-0 h-full w-16
    bg-slate-200 dark:bg-synth-dark">
        <div class="flex flex-col justify-between items-center h-full">
            <div class="flex flex-col justify-start items-center w-full">

                <button class="bg-slate-300 dark:bg-slate-950
                w-full flex items-center justify-center aspect-square"
                on:click={toggleSidebar}>
                    <img src="tjlogolarge.png" alt="Tiger Junction Logo"
                    class="w-14 h-14">
                </button>

                <LightButton />

                <IconLink href="/home" 
                src={homeIcon} alt="Home Icon"
                selected={currentApp === "home"} />

                <Icon src={lineIcon} alt="Horizontal Line" />

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
    </div>
{/if}