<script lang="ts">
import Search from "./elements/search/Search.svelte";
import Saved from "./elements/save/Saved.svelte";
import Pinned from "./elements/save/Pinned.svelte";
import SearchResults from "./elements/search/SearchResults.svelte";
</script>

<div class="h-full max-h-screen w-full pt-2 flex flex-col">
    <div>
        <Search />
    </div>
    <div>
        <Saved />
    </div>
    <div>
        <Pinned />
    </div>
    <div>
        <SearchResults />
    </div>
</div>