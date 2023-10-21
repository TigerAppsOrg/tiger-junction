<script lang="ts">
import { createEventDispatcher } from "svelte";
import { fade } from "svelte/transition";
import infoIcon from "$lib/img/icons/infoicon.svg"
import errorIcon from "$lib/img/icons/blockicon.svg";

const dispatch = createEventDispatcher();

export let type = "success";
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<article class={type}
in:fade={{ duration: 150 }}
out:fade={{ duration: 300 }}
on:click={() => dispatch("dismiss")}>
    {#if type === "info"}
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
    class="w-6 h-6">
        <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>      
    {:else if type === "error"}
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
    class="w-6 h-6">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>      
    {:else if type === "warning"}
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
    class="w-6 h-6">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>      
    {:else}
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
    class="w-6 h-6">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>      
    {/if}

    <div class="ml-4">
        <slot />
    </div>
</article>

<style lang="postcss">
article {
    opacity: 0.85;
    color: black;
    padding: 0.75rem 1.5rem;
    border-radius: 0.375rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: fit-content;
    margin: 0.5rem auto 0 auto;
    cursor: pointer;
}

.success {
    background-color: hsl(120, 52%, 75%);
}

.success:hover {
    background-color: hsl(120, 52%, 70%);
}

.error {
    background-color: hsl(1, 100%, 69%);
}

.warning {
    background-color: hsl(35, 99%, 65%);
}

.info {
    background-color: hsl(197, 34%, 72%);
}

.close {
    z-index: 5000;
    color: black;
    background: transparent;
    border: 0 none;
    padding: 0;
    margin: 0 0 0 auto;
    line-height: 1;
    font-size: 1rem;
}
</style>