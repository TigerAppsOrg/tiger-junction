<script lang='ts'>
    import Sidebar from "$lib/components/general/Sidebar.svelte";

    export let data;
    $: currentApp = data.currentApp || "";

    let sidebar_show = false;
</script>

<div class="h-screen w-screen bg-white dark:bg-synth-light">
    <Sidebar bind:show={sidebar_show} {currentApp} />
    <slot />
</div>