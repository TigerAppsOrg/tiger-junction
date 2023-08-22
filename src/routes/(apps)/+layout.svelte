<script lang='ts'>
    import ModalLib from "$lib/components/general/ModalLib.svelte";
import Sidebar from "$lib/components/general/Sidebar.svelte";

    export let data;
    $: currentApp = data.currentApp || "";

    let sidebar_show = false;
</script>

<ModalLib />
<div class="h-screen w-screen flex bg-white dark:bg-synth-medium">
    <div class="my-2">
        <Sidebar bind:show={sidebar_show} {currentApp} />
    </div>
    <slot />
</div>