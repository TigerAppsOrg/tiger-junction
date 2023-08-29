<script lang="ts">
import Saved from "./elements/save/Saved.svelte";
import Pinned from "./elements/save/Pinned.svelte";
import SearchResults from "./elements/search/SearchResults.svelte";
import SearchBar from "./elements/search/SearchBar.svelte";
import type { SupabaseClient } from "@supabase/supabase-js";

export let supabase: SupabaseClient;
</script>

<div class="h-full max-h-full w-full flex flex-col">
    <div>
        <SearchBar {supabase} />
    </div>
    <div>
        <Saved {supabase} />
    </div>
    <div>
        <Pinned {supabase} />
    </div>
    <div class="flex-1">
        <SearchResults {supabase} />
    </div>
</div>