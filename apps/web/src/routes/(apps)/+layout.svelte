<script lang="ts">
    import AppHeader from "$lib/components/general/AppHeader.svelte";
    import ModalLib from "$lib/components/general/ModalLib.svelte";
    import ThemePanel from "$lib/components/general/style/ThemePanel.svelte";
    import { setContext } from "svelte";
    import type { Snippet } from "svelte";

    let { data, children }: { data: any; children?: Snippet } = $props();
    setContext("supabase", data.supabase);
</script>

<ModalLib />
<ThemePanel />
<div class="h-screen w-screen flex flex-col app-bg bg-effects">
    <AppHeader />
    {@render children?.()}
</div>

<style lang="postcss">
    .app-bg {
        background-color: var(--bg-light);
    }
    :global(.dark) .app-bg {
        background-color: var(--bg-dark);
    }
</style>
