<script lang='ts'>
    import Sidebar from "$lib/components/general/Sidebar.svelte";

    let sidebar_show = true;
</script>

<div class="h-screen w-screen">
    <Sidebar bind:show={sidebar_show} />
    <slot />
</div>