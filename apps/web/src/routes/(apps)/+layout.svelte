<script lang="ts">
    import AppHeader from "$lib/components/general/AppHeader.svelte";
    import ModalLib from "$lib/components/general/ModalLib.svelte";
    import { setContext } from "svelte";

    export let data;
    setContext("supabase", data.supabase);
</script>

<ModalLib />
<div class="h-screen w-screen flex flex-col bg-zinc-50 dark:bg-zinc-900">
    <AppHeader />
    <slot />
</div>
