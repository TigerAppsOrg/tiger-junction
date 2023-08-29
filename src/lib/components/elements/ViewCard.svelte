<script lang="ts">
    export let className: string = "";
</script>

<div class="{className} card">
    <div class="max-w-full w-32 max-h-32 mx-auto mb-6">
        <slot name="image"></slot>
    </div>
    <h1 class="font-bold text-xl mb-2">
        <slot name="title"></slot>
    </h1>
    <p class="font-light text-xl">
        <slot name="description">No Description</slot>
    </p>
</div>

<style lang="postcss">
    .card {
        @apply p-8 rounded-lg shadow-lg;
    }
</style>