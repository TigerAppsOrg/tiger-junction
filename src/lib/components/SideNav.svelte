<script lang="ts">
import NavButton from "$lib/components/elements/NavButton.svelte";

</script>

<nav>
    <div>
        <a href="/home" class="flex items-center">
            <img src="tjlogolarge.png" alt="Tiger Junction logo"
            class="w-12 h-12">
            <span class="text-lg font-bold">TigerJunction</span>
        </a>
    </div>
    <div>
        <NavButton>
            <span slot="icon">
                i
            </span>
            <span slot="text">
                Icahn
            </span>
        </NavButton>
    </div>
</nav>