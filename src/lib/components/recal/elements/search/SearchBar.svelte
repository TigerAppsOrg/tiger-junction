<script lang="ts">
import settingsIcon from "$lib/img/icons/settingsicon.svg";
import { modalStore } from "$lib/stores/modal";
import { searchSettings, searchResults, currentTerm, type SearchSettings } from "$lib/stores/recal";

let inputBar: HTMLInputElement;

$: triggerSearch($searchSettings);

const triggerSearch = (settings: SearchSettings) => {
    if (!inputBar || inputBar.value === undefined) return;
    searchResults.search(inputBar.value, $currentTerm, settings);
}
</script>

<div>
    <div class="flex gap-2">
        <input type="text" placeholder="Search" 
        class="search-input std-area" bind:this={inputBar}
        on:input={() => triggerSearch($searchSettings)}>
        <button class="adv-search"
        on:click={() => modalStore.open("adv", { clear: true })}>
            <img src={settingsIcon} alt="Settings Icon" 
            class="w-6 h-6 dark:invert-[.7] invert-[.5]">
        </button>
    </div>
</div>

<style lang="postcss">
.search-input {
    @apply flex-1 p-2 h-10 w-20;
}

.adv-search {
    @apply h-10 w-10 flex justify-center items-center duration-150
    border-slate-600/30 border-2 dark:border-slate-200/60 rounded-xl;
}

.adv-search:hover {
    @apply bg-slate-100 border-slate-600/40
    dark:bg-slate-700 dark:border-slate-200/90;
}
</style>