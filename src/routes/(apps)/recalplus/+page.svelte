<script lang="ts">
import Calendar from "$lib/components/recal/Calendar.svelte";
import Left from "$lib/components/recal/Left.svelte";
import Top from "$lib/components/recal/Top.svelte";
import { CURRENT_TERM_ID } from "$lib/constants.js";
import { fetchRawCourseData, fetchUserSchedules, populatePools } from "$lib/scripts/ReCal+/fetchDb.js";
import { onMount } from "svelte";

export let data;

onMount(async () => {
    await fetchRawCourseData(data.supabase, CURRENT_TERM_ID);
    await fetchUserSchedules(data.supabase, CURRENT_TERM_ID);
    await populatePools(data.supabase, CURRENT_TERM_ID);
});

</script>

<svelte:head>
    <title>TigerJunction | ReCal+</title>
</svelte:head>


<div class="h-screen flex flex-col flex-1 max-w-[1400px] mx-auto
bg-white dark:bg-black max-h-screen">
    <div class="mx-2">
        <Top supabase={data.supabase} />
    </div>
    <!-- Fills bottom area does not cause page scroll -->
    <div class="flex flex-1 m-2 max-h-[calc(100vh-80px)]">
        <div class="w-1/4 min-w-[200px]">
            <Left />
        </div>
        <div class="flex-1 min-w-[400px] ml-2">
            <Calendar />
        </div>
    </div>
</div>

<style lang="postcss">

</style>