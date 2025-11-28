<script lang="ts">
    import Saved from "./left/Saved.svelte";
    import SearchResults from "./left/SearchResults.svelte";
    import SearchBar from "./left/SearchBar.svelte";
    import Events from "./left/Events.svelte";
</script>

<div class="w-full flex flex-col h-full overflow-y-hidden">
    <div>
        <SearchBar />
    </div>
    <section class="flex-1 overflow-y-hidden mt-2">
        <div class="min-h-[24px]">
            <Events />
        </div>
        <div>
            <Saved />
        </div>
        <div>
            <SearchResults />
        </div>
    </section>
</div>

<style lang="postcss">
    /* 
    This took hours to figure out. It allows the children to take up 
    the remaining space in the container while maintaining a max-height
    proportional to the parent container. This is a lesson that
    StackOverflow is almost always better than AI for complex problems.

    Credit: 
    https://stackoverflow.com/questions/70324159/how-to-set-up-an-element-with-max-height-so-that-the-elements-inside-it-will-tak 
    */

    section {
        display: grid;
        grid-template-rows: repeat(auto-fit, minmax(0, min-content));
        gap: 0.5rem;
    }

    section > *:last-child {
        grid-row-end: span 2;
    }

    section > div {
        /* height: fit-content; */
        max-height: 100%;
        @apply overflow-y-hidden flex flex-col;
    }
</style>
