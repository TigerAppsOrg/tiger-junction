<script lang="ts">
    import AdminHeader from "../AdminHeader.svelte";
    
    export let data;

    let initialized = false;

</script>

<main class="h-screen flex flex-col bg-zinc-900">
    <AdminHeader supabase={data.supabase} />

    {#if !initialized}
        <div class="mx-auto mt-6 text-center">
            <h1 class="text-3xl font-bold text-white mb-6">
                Prerequisite Manager of Death
            </h1>
            <button class="button-85">
                Start
            </button>
        </div>
    {:else}
        <div>

        </div>
    {/if}
</main>

<style>
    .button-85 {
        padding: 0.6em 2em;
        border: none;
        outline: none;
        color: rgb(255, 255, 255);
        background: #111;
        cursor: pointer;
        position: relative;
        z-index: 0;
        border-radius: 10px;
        user-select: none;
        -webkit-user-select: none;
        touch-action: manipulation;
        transition-duration: 150ms;
    }

    .button-85:active {
        transform: scale(0.95);
    }

    .button-85:before {
        content: "";
        background: linear-gradient(
            45deg,
            #ff0000,
            #ff7300,
            #fffb00,
            #48ff00,
            #00ffd5,
            #002bff,
            #7a00ff,
            #ff00c8,
            #ff0000
        );
        position: absolute;
        top: -2px;
        left: -2px;
        background-size: 400%;
        z-index: -1;
        filter: blur(5px);
        -webkit-filter: blur(5px);
        width: calc(100% + 4px);
        height: calc(100% + 4px);
        animation: glowing-button-85 20s linear infinite;
        transition: opacity 0.3s ease-in-out;
        border-radius: 10px;
    }

    @keyframes glowing-button-85 {
        0% {
            background-position: 0 0;
        }
        50% {
            background-position: 400% 0;
        }
        100% {
            background-position: 0 0;
        }
    }

    .button-85:after {
        z-index: -1;
        content: "";
        position: absolute;
        width: 100%;
        height: 100%;
        background: #222;
        left: 0;
        top: 0;
        border-radius: 10px;
    }
</style>