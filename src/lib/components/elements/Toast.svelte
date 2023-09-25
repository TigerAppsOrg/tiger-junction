<script lang="ts">
import { createEventDispatcher } from "svelte";
import { fade } from "svelte/transition";
import infoIcon from "$lib/img/icons/infoicon.svg"

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
        {infoIcon}
    {:else if type === "error"}
        E
    {:else if type === "warning"}
        W
    {:else}
        <img class="w-6" src={infoIcon} alt="Info Icon">
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