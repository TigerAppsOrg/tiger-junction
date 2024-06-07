<script lang="ts">
    import Header from "$lib/components/Header.svelte";
    import ModalLib from "$lib/components/general/ModalLib.svelte";
    import { setContext } from "svelte";

    export let data;
    setContext("supabase", data.supabase);
</script>

<ModalLib />
<div class="h-screen w-screen flex flex-col bg-zinc-50 dark:bg-black">
    <Header />
    <slot />
</div>
