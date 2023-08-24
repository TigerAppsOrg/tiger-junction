<script lang="ts">
import Calendar from "$lib/components/recal/Calendar.svelte";
import Left from "$lib/components/recal/Left.svelte";
import Top from "$lib/components/recal/Top.svelte";
import { fetchRawCourseData } from "$lib/scripts/ReCal+/fetchRawCourse.js";
import { onMount } from "svelte";

export let data;

onMount(() => {
    fetchRawCourseData(data.supabase, 1242);
});

</script>

<svelte:head>
    <title>TigerJunction | ReCal+</title>
</svelte:head>


<div class="h-screen flex flex-col flex-1 max-w-[1400px] mx-auto
bg-white dark:bg-black">
    <div class="mx-2">
        <Top supabase={data.supabase} />
    </div>
    <div class="flex flex-1">
        <div class="w-1/4 min-w-[200px] mr-2">
            <Left />
        </div>
        <div class="flex-1 min-w-[400px]">
            <Calendar />
        </div>
    </div>
</div>

<style lang="postcss">

</style>