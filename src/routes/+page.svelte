<script lang="ts">
    import { goto } from '$app/navigation';

    export let data;

    const handleLogin = async () => { 

        if ((await data.supabase.auth.getUser()).data.user) {
            goto("/home");
            return;
        }

        await data.supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: "http://localhost:5173/auth/callback"
            }
        });
    }
</script>

<div class="h-screen w-screen bg-secondary px-20">
    <nav class="flex justify-between items-center text-xl">
        <div id="left">
            <a href="/" class="flex items-center">
                <img src="tjlogolarge.png" alt="Tiger Junction logo"
                class="w-16 h-16">
                <span>TigerJunction</span>
            </a>
        </div>
        <div id="right" class="space-x-6">
            <a href="#about">
                About
            </a>
            <button class="btn btn-primary"
            on:click={handleLogin}>
                Login
            </button>
        </div>
    </nav>
    <main>
        <div class="space-y-4">
            <p class="text-xl">
                TigerJunction
            </p>
            <h1 class="text-5xl">
                NEXT GENERATION COURSE PLANNING
            </h1>
            <button on:click={handleLogin}
            class="bg-accent rounded-md py-2 px-4 text-xl">
                Get Started
            </button>
        </div>
    </main>
</div>
<div id="about" class="h-screen w-screen bg-tertiary">

</div>
<footer class="bg-black text-center text-white text-sm font-light
py-4">
    Made with <a href="https://svelte.dev/">Svelte</a> by @joshuamotoaki
</footer>
