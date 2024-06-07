<script lang="ts">
    import { calColors } from "$lib/stores/styles";
</script>

<div class="loader" style={"border-top-color: " + $calColors[0]}></div>

<style lang="postcss">
    .loader {
        border-radius: 50%;
        width: 24px;
        height: 24px;
        animation: spin 0.5s linear infinite;
        @apply border-8 border-slate-600/30 border-t-8 
    dark:border-slate-300/60;
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }
</style>
