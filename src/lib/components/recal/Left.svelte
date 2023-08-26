<script lang="ts">
import Saved from "./elements/save/Saved.svelte";
import Pinned from "./elements/save/Pinned.svelte";
import SearchResults from "./elements/search/SearchResults.svelte";
import SearchBar from "./elements/search/SearchBar.svelte";
</script>

<div class="h-full max-h-full w-full pt-2 flex flex-col">
    <div>
        <SearchBar />
    </div>
    <div>
        <Saved />
    </div>
    <div>
        <Pinned />
    </div>
    <div class="flex-1">
        <SearchResults />
    </div>
</div>