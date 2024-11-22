<script lang="ts">
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
</script>

<div
    class="fixed z-50 mx-4 w-11/12 max-w-7xl rounded-2xl bg-white
    px-4 py-2 shadow-md">
    <nav class="flex justify-between sm:grid sm:grid-cols-3">
        <button
            onclick={() => {
                if ($page.url.pathname === "/") {
                    document.getElementById("main")?.scrollIntoView({
                        behavior: "smooth"
                    });
                } else {
                    goto("/");
                }
            }}
            class="mr-6 flex flex-shrink-0 items-center gap-1 text-black">
            <img
                src="/tjlogonew.png"
                alt="Tiger Junction logo"
                class="h-10 w-10" />
            <span class="text-xl font-semibold tracking-tight"
                >TigerJunction</span>
        </button>
        <div class="hidden items-center justify-center gap-4 sm:flex lg:gap-8">
            {#if $page.url.pathname === "/"}
                <button
                    onclick={() => {
                        document.getElementById("about")?.scrollIntoView({
                            behavior: "smooth"
                        });
                    }}
                    class="nav-link">
                    About
                </button>
                <button
                    onclick={() => {
                        document.getElementById("features")?.scrollIntoView({
                            behavior: "smooth"
                        });
                    }}
                    class="nav-link">
                    Features
                </button>
            {/if}
        </div>
        <div class="flex items-center justify-end">
            <button
                class="rounded-lg bg-indigo-600 px-4
                    py-2 text-center font-bold text-white duration-100
                     hover:bg-indigo-500">
                Log In
            </button>
        </div>
    </nav>
</div>

<style lang="postcss">
    nav {
        grid-template-columns: 1fr 1fr 1fr;
    }

    .nav-link {
        position: relative;
        text-decoration: none;
    }

    .nav-link::after {
        content: "";
        position: absolute;
        width: 100%;
        height: 2px;
        bottom: 0;
        left: 0;
        transform: scaleX(0);
        transform-origin: bottom right;
        transition: transform 0.3s ease-out;
        @apply bg-indigo-600;
    }

    .nav-link:hover::after {
        transform: scaleX(1);
        transform-origin: bottom left;
    }
</style>
