<script lang="ts">
    import Header from "$lib/components/Header.svelte";
    export let data;
</script>

<Header supabase={data.supabase} />
<slot />