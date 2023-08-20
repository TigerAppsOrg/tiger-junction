<script lang='ts'>
    import Sidebar from "$lib/components/general/Sidebar.svelte";

    let sidebar_show = false;
</script>

<div class="h-screen w-screen bg-white dark:bg-synth-light">
    <Sidebar bind:show={sidebar_show} />
    <slot />
</div>