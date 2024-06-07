<script lang="ts">
    import moonIcon from "$lib/img/icons/moonicon.svg";
    import sunIcon from "$lib/img/icons/sunicon.svg";
    import { darkTheme } from "$lib/stores/state";
</script>

<button
    on:click={() => ($darkTheme = !$darkTheme)}
    class="bg-yellow-300 dark:bg-synth-light aspect-square
dark:text-zinc-100 rounded-full m-2">
    {#if $darkTheme}
        <img src={moonIcon} alt="Dark Mode Icon" class="w-10 p-1 invert" />
    {:else}
        <img src={sunIcon} alt="Light Mode Icon" class="w-10 p-1" />
    {/if}
</button>

<style lang="postcss">
</style>
