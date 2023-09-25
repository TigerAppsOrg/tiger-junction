<script lang="ts">
import { createEventDispatcher } from "svelte";
import { fade } from "svelte/transition";

const dispatch = createEventDispatcher();

export let type = "success";
</script>

<article class={type}
in:fade={{ duration: 100 }}
out:fade={{ duration: 300 }}>
    {#if type === "info"}
        I
    {:else if type === "error"}
        E
    {:else}
        S
    {/if}

    <div class="ml-4">
        <slot />
    </div>

    <button class="close" on:click={() => dispatch("dismiss")}>
        X
    </button>

</article>

<style lang="postcss">
article {
    opacity: 0.8;
    color: black;
    padding: 0.75rem 1.5rem;
    border-radius: 0.375rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 20rem;
    margin: 0.5rem auto 0 auto;
}

.success {
    background-color: hsl(120, 52%, 75%);
}

.error {
    background-color: #hsl(1, 100%, 69%);
}

.info {
    background-color: #hsl(197, 34%, 72%);
}

.close {
    color: black;
    background: transparent;
    border: 0 none;
    padding: 0;
    margin: 0 0 0 auto;
    line-height: 1;
    font-size: 1rem;
}
</style>