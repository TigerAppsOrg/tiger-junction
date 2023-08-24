<script lang="ts">
import Search from "./elements/search/Search.svelte";
import Saved from "./elements/save/Saved.svelte";
import Pinned from "./elements/save/Pinned.svelte";
import SearchResults from "./elements/search/SearchResults.svelte";
</script>

<div class="h-full w-full pt-2 ml-2">
    <Search />
    <Saved />
    <Pinned />
    <SearchResults />
</div>