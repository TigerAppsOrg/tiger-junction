<script lang="ts">
    import AdminHeader from "../AdminHeader.svelte";
    
    export let data;

</script>

<main class="h-screen flex flex-col bg-zinc-100 dark:bg-synth-medium">
    <AdminHeader supabase={data.supabase} />
</main>
