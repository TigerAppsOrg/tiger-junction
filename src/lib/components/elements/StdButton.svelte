<script lang="ts">
export let message = "DEFAULT MESSAGE";
export let onClick = () => {};
</script>

<button class="rounded-md py-2 text-center
flex-1 bg-std-green text-black hover:bg-std-darkGreen
duration-150"
on:click={onClick}>
    {message}
</button>