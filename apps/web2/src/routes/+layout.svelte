<script lang="ts">
    import "@fontsource/lato";
    import "@fontsource/spectral";

    import "../app.css";
    let { children } = $props();
</script>

<div class="max-w-screen overflow-x-hidden">
    {@render children()}
</div>
