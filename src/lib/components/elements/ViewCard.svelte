<script lang="ts">
    export let className: string = "";
</script>

<div class="{className} card">
    <h1 class="font-bold text-2xl mb-2">
        <slot name="title"></slot>
    </h1>
    <p class="text-xl font-light">
        <slot name="description">No Description</slot>
    </p>
</div>

<style lang="postcss">
    .card {
        @apply p-8 rounded-lg shadow-lg;
    }
</style>