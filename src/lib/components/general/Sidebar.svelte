<script lang="ts">
import { fly } from "svelte/transition";
import { createEventDispatcher } from "svelte";
import NavButton from "../elements/NavButton.svelte";

import homeIcon from "$lib/img/icons/homeicon.svg";
import aboutIcon from "$lib/img/icons/abouticon.svg";
import calendarIcon from "$lib/img/icons/calendaricon.svg";
import lightbulbIcon from "$lib/img/icons/lightbulbicon.svg";
import treeIcon from "$lib/img/icons/treeicon.svg";
import settingsIcon from "$lib/img/icons/settingsicon.svg";

type SidebarEvent = {
    backdrop: MouseEvent;
    sidebar: MouseEvent;
};
const dispatch = createEventDispatcher<SidebarEvent>();

export let show = false;

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
    class="fixed top-0 left-0 h-full w-20 
    bg-slate-200 dark:bg-synth-dark">
        <div class="flex flex-col justify-between items-center">
            <div class="flex flex-col justify-start items-center">

                <img src="tjlogolarge.png" alt="Tiger Junction Logo"
                class="w-16 h-16 mb-6">

                <a href="/recalplus">
                    <img src={calendarIcon} alt="ReCal+ Icon"
                    class="logolink">
                </a>

                <a href="/coursegenie">
                    <img src={lightbulbIcon} alt="CourseGenie Icon"
                    class="logolink">
                </a>

                <a href="/reqtree">
                    <img src={treeIcon} alt="ReqTree Icon"
                    class="logolink">
                </a>
            </div>

        </div>       
    </div>
{/if}

<style lang="postcss">
.logolink {
    @apply dark:invert;
}
</style>