<script lang="ts">
import settingsIcon from "$lib/img/icons/settingsicon.svg";
import { modalStore } from "$lib/stores/modal";
import { searchSettings, searchResults, rawCourseData, currentTerm } from "$lib/stores/recal";

const handleInput = (event: Event) => {
    let input = (event.target as HTMLInputElement).value;
    searchResults.search(input, $currentTerm, $searchSettings);
    console.log($searchResults);
}
</script>

<div>
    <div class="flex gap-2">
        <input type="text" placeholder="Search" 
        class="search-input std-area"
        on:input={handleInput}>
        <button class="adv-search std-area"
        on:click={() => modalStore.open("adv", { clear: true })}>
            <img src={settingsIcon} alt="Settings Icon" 
            class="w-6 h-6 dark:invert invert-[0.5]">
        </button>
    </div>
</div>

<style lang="postcss">
.search-input {
    @apply flex-1 p-2 h-10 w-20;
}

.adv-search {
    @apply h-10 w-10 flex justify-center items-center duration-150;
}

.adv-search:hover {
    @apply bg-slate-100 dark:bg-synth-light border-slate-600/40;
}
</style>