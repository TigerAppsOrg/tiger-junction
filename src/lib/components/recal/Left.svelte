<script lang="ts">
    import Saved from "./left/Saved.svelte";
    import SearchResults from "./left/SearchResults.svelte";
    import SearchBar from "./left/SearchBar.svelte";
    import Events from "./left/Events.svelte";

    import { isEventOpen } from "$lib/stores/styles";
    import { searchResults } from "$lib/stores/recal";
</script>

<div class="w-full flex flex-col max-h-full overflow-y-hidden">
    <div>
        <SearchBar />
    </div>
    <div class="flex-1 flex flex-col overflow-y-hidden space-y-2 mt-2">
        <Events />
        <Saved />
        <SearchResults />
    </div>
</div>
