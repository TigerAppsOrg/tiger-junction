<script lang="ts">
import { goto } from "$app/navigation";
    import LightSwitch from "$lib/components/general/LightSwitch.svelte";

export let data;

const handleLogout = async () => { 
    const { error } = await data.supabase.auth.signOut();
    if (!error) goto("/");
}
</script>

<div class=" h-screen w-screen bg-white dark:bg-synth-dark">
    <LightSwitch />
</div>

<style lang="postcss">


</style>