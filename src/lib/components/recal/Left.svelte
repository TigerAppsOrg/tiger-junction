<script lang="ts">
    import Saved from "./left/Saved.svelte";
    import SearchResults from "./left/SearchResults.svelte";
    import SearchBar from "./left/SearchBar.svelte";
    import Events from "./left/Events.svelte";

    import { isEventOpen } from "$lib/stores/styles";
    import { searchResults } from "$lib/stores/recal";
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
