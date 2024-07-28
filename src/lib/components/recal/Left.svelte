<script lang="ts">
    import Saved from "./left/Saved.svelte";
    import SearchResults from "./left/SearchResults.svelte";
    import SearchBar from "./left/SearchBar.svelte";
    import Events from "./left/Events.svelte";
</script>

<div class="w-full flex flex-col max-h-full overflow-y-hidden">
    <div>
        <SearchBar />
    </div>
    <section class="flex-1 overflow-y-hidden mt-2">
        <div class="min-h-[24px]">
            <Events />
        </div>
        <div>
            <Saved />
        </div>
        <div>
            <SearchResults />
        </div>
    </section>
</div>

<style lang="postcss">
    section {
        display: grid;
        grid-template-rows: repeat(auto-fit, minmax(0, min-content));
        gap: 0.5rem;
    }

    section > *:last-child {
        grid-row-end: span 2;
    }

    section > div {
        height: fit-content;
        max-height: 100%;
        @apply overflow-y-hidden flex flex-col;
    }
</style>
