<script lang='ts'>
    import Sidebar from "$lib/components/general/Sidebar.svelte";

    export let data;
    $: currentApp = data.currentApp || "";

    let sidebar_show = false;
</script>

<div class="h-screen w-screen flex bg-slate-100 dark:bg-synth-medium">
    <div class="my-2">
        <Sidebar bind:show={sidebar_show} {currentApp} />
    </div>
    <slot />
</div>