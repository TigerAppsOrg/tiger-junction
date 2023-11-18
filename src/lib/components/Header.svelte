<script lang="ts">
    import { goto } from "$app/navigation";
    import { calColors, calculateCssVars } from "$lib/stores/styles";
    import type { SupabaseClient } from "@supabase/supabase-js";

    export let supabase: SupabaseClient;

    const handleLogout = async () => {
        await supabase.auth.signOut();
        goto("/");
    }

    $: cssVarStyles = calculateCssVars("0", $calColors);

</script>

<nav class="w-screen h-10 border-b-[1px]" style={cssVarStyles}>
    <div class="flex justify-between items-center px-4">
        <div id="left">
            <a href="/home" class="flex items-center">
                <img src="tjlogolarge.png" alt="Tiger Junction logo"
                class="w-10 h-10">
                <span class="text-xl font-light">TigerJunction</span>
            </a>
        </div>
        <div id="right" class="space-x-6">

        </div>
    </div>
</nav>

<style lang="postcss">

</style>