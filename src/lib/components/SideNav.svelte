<script lang="ts">
import NavButton from "$lib/components/elements/NavButton.svelte";

</script>

<nav class="bg-white h-screen w-fit">
    <div>
        <a href="/home" class="flex items-center">
            <img src="tjlogolarge.png" alt="Tiger Junction logo"
            class="w-12 h-12">
            <span class="text-lg font-bold">TigerJunction</span>
        </a>
    </div>
    <div class="bg-green-500 flex flex-col justify-center items-center">
        <NavButton>
            <span slot="icon">
                
            </span>
            <span slot="text">
                ReCal+
            </span>
        </NavButton>
        <NavButton>
            <span slot="icon">
                
            </span>
            <span slot="text">
                CourseGenie
            </span>
        </NavButton>
        <NavButton>
            <span slot="icon">
                
            </span>
            <span slot="text">
                ReqTree
            </span>
        </NavButton>
        <NavButton>
            <span slot="icon">
                
            </span>
            <span slot="text">
                Settings
            </span>
        </NavButton>
    </div>
</nav>