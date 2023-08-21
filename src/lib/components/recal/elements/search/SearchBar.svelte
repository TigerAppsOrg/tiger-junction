<script lang="ts">
import settingsIcon from "$lib/img/icons/settingsicon.svg";

const handleAdvancedSearch = () => {
    console.log("Advanced Search");
} 

</script>

<div>
    <div class="flex gap-2">
        <input type="text" placeholder="Search" class="search-input">
        <button class="adv-search"
        on:click={handleAdvancedSearch}>
            <img src={settingsIcon} alt="Settings Icon" class="w-6 h-6">
        </button>
    </div>
</div>

<style lang="postcss">
.search-input {
    @apply rounded-xl flex-1 p-2 h-10 w-20
    focus:outline-primary;
}

.adv-search {
    @apply rounded-xl bg-white h-10 w-10 flex justify-center items-center;
}
</style>