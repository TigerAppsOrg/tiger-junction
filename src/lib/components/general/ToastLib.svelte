<script lang="ts">
    import Toast from "../ui/Toast.svelte";
    import { toastStore } from "$lib/stores/toast";
</script>

{#if $toastStore}
    <section>
        {#each $toastStore as toast (toast.id)}
            <Toast
                type={toast.type}
                on:dismiss={() => toastStore.remove(toast.id)}>
                {toast.message}
            </Toast>
        {/each}
    </section>
{/if}

<style lang="postcss">
    section {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        width: fit-content;
        margin-left: auto;
        margin-right: auto;
        display: flex;
        margin-bottom: 1rem;
        justify-content: center;
        flex-direction: column;
        z-index: 1000;
    }
</style>
