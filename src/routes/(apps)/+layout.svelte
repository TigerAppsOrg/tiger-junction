<script lang='ts'>
import ModalLib from "$lib/components/general/ModalLib.svelte";
import Sidebar from "$lib/components/general/Sidebar.svelte";
import ToastLib from "$lib/components/general/ToastLib.svelte";

export let data;
$: currentApp = data.currentApp || "";

let sidebar_show = false;
</script>

<ModalLib supabase={data.supabase} />
<ToastLib />
<div class="h-screen w-screen flex bg-white dark:bg-black">
    <!-- <div class="my-2">
        <Sidebar bind:show={sidebar_show} {currentApp} />
    </div> -->
    <slot />
</div>