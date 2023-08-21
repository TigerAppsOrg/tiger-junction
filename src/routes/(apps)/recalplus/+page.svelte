<script lang="ts">
import Calendar from "$lib/components/recal/Calendar.svelte";
import Left from "$lib/components/recal/Left.svelte";
import Top from "$lib/components/recal/Top.svelte";

</script>

<svelte:head>
    <title>TigerJunction | ReCal+</title>
</svelte:head>


<div class="h-screen flex flex-col flex-1 max-w-[1400px] mx-auto">
    <div class="mx-2">
        <Top />
    </div>
    <div class="flex flex-1">
        <div class="w-1/4 min-w-[200px]">
            <Left />
        </div>
        <div class="flex-1">
            <Calendar />
        </div>
    </div>
</div>

<style lang="postcss">

</style>