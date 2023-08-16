<script lang="ts">
import { page } from "$app/stores";
</script>

<div class="h-[80vh] flex justify-center items-center">
    <div class="text-center">
        <h1 class="gradient-text text-9xl mb-2 font-bold">Oh noes!</h1>
        <h2 class="text-5xl mb-8 text-gray-700 font-light">
            {$page.status} {$page.error?.message}
        </h2>
        <a href="/">
            <button class="btn-cool text-2xl">
                Go To Homepage →
            </button>
        </a>
    </div>
</div>

<style lang="postcss">
.gradient-text {
    @apply bg-gradient-to-r from-primary to-tertiary;
    -webkit-background-clip: text; /* For Safari */
    background-clip: text;
    color: transparent;
}

.btn-cool {
    @apply bg-gradient-to-r from-blue-500 to-purple-500
    text-white rounded-full px-4 py-2;
}

.btn-cool:hover {
    @apply shadow-lg duration-150;
}
</style>