<!-- 
    Standard button component
-->

<script lang="ts">
type Scheme = "green" | "neutral" | "red" | "blue" | "orange";

export let scheme: Scheme = "green"
export let message = "DEFAULT MESSAGE";
export let onClick = () => {};
export let submit = false;
</script>

<button class={scheme} on:click={onClick} type={submit ? "submit" : "button"}>
    {message}
</button>

<style lang="postcss">
button {
    @apply rounded-md py-2 text-center flex-1 duration-150;
}

.green {
    @apply bg-std-green hover:bg-std-darkGreen text-black;
}

.red {
    @apply bg-std-red hover:bg-std-darkRed text-black;
}

.blue {
    @apply bg-std-blue hover:bg-std-darkBlue text-black;
}

.orange {
    @apply bg-std-orange hover:bg-std-darkOrange text-black;
}

.neutral {
    @apply border-2 border-slate-600/30
    hover:bg-slate-200/30 dark:hover:bg-slate-600/30;
}

</style>