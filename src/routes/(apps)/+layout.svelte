<script lang='ts'>
import Header from "$lib/components/Header.svelte";
import ModalLib from "$lib/components/general/ModalLib.svelte";

export let data;

</script>

<ModalLib supabase={data.supabase} />
<div class="h-screen w-screen flex flex-col dark:bg-black">
<Header supabase={data.supabase} />
<slot />
</div>