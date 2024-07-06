<script lang="ts">
    import Saved from "./elements/save/Saved.svelte";
    import SearchResults from "./elements/search/SearchResults.svelte";
    import SearchBar from "./elements/search/SearchBar.svelte";
    import Events from "./Events.svelte";
</script>

<div class="h-full max-h-full w-full flex flex-col">
    <div>
        <SearchBar />
    </div>
    <div>
        <Events />
    </div>
    <div>
        <Saved />
    </div>
    <div class="top-0">
        <SearchResults />
    </div>
</div>
