<script lang="ts">
import { fly } from "svelte/transition";
import { createEventDispatcher } from "svelte";
    import NavButton from "../elements/NavButton.svelte";

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
            <slot name="icon">
                !
            </slot>
            <slot name="text">
                ReCal+
            </slot>
        </NavButton>

    </nav>
{/if}