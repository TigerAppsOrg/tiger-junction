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

<button class="btn btn-primary"
on:click={handleLogin}>
    Login
</button>