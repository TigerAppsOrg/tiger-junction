<script lang="ts">
    import "@fontsource/lato";
    import "@fontsource/spectral";

    import "../app.css";
    import { toggleFont } from "$lib/client/font";
    let { children } = $props();
</script>

{@render children()}
