<script lang="ts">
    import Saved from "./elements/save/Saved.svelte";
    import SearchResults from "./elements/search/SearchResults.svelte";
    import SearchBar from "./elements/search/SearchBar.svelte";
</script>

<div class="h-full max-h-full w-full flex flex-col">
    <div>
        <SearchBar />
    </div>
    <div>
        <Saved />
    </div>
    <div class="top-0">
        <SearchResults />
    </div>
</div>
