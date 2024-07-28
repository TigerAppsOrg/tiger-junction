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
    <div
        class="flex-1 overflow-y-hidden space-y-2 mt-2
        border-4 border-red-500 flex flex-col">
        <div class="area min-h-[24px]">
            <Events />
        </div>
        <div class="area">
            <Saved />
        </div>
        <div class="area">
            <SearchResults />
        </div>
    </div>
</div>

<style lang="postcss">
    .area {
        @apply overflow-y-hidden flex flex-col;
    }
</style>
