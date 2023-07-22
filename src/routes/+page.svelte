<script lang="ts">
    export let data;

    const handleLogin = async () => { 
        await data.supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: "http://localhost:5173/auth/callback"
            }
        });
    }
</script>

<div class="h-screen w-screen bg-secondary">
    <nav class="flex justify-between itesm-center">
        <div id="left">

        </div>
        <div id="right">
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
        <div>
            <p>
                TigerJunction
            </p>
            <h1 class="text-6xl">
                NEXT GENERATION COURSE PLANNING
            </h1>
            <button on:click={handleLogin}
            class="bg-accent rounded-md py-2 px-4">
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
