<script lang="ts">
    import Checkpill from "$lib/components/elements/Checkpill.svelte";
    import Modal from "$lib/components/elements/Modal.svelte";
    import StdButton from "$lib/components/elements/StdButton.svelte";
    import TogTog from "$lib/components/elements/TogTog.svelte";
    import { modalStore } from "$lib/stores/modal";
    import { DEFAULT_SETTINGS, searchSettings } from "$lib/stores/recal";

    export let showModal: boolean = false;
    /**
     * Save settings and close modal
     */
    const saveSettings = () => {
        modalStore.pop();
    };

    let minInput: number = $searchSettings.filters["Rating"].min;
    let maxInput: number = $searchSettings.filters["Rating"].max;

    /**
     * Handle min rating input
     * @param e Input event
     */
    const handleMin = (e: Event) => {
        let target = e.target as HTMLInputElement;
        minInput = parseFloat(target.value);
        if (Number.isNaN(minInput)) return;
        if (minInput > maxInput) minInput = maxInput;
        if (minInput < 0) minInput = 0;
        if (minInput > 5) minInput = 5;
        $searchSettings.filters["Rating"].min = minInput;
    };

    /**
     * Handle max rating input
     * @param e Input event
     */
    const handleMax = (e: Event) => {
        let target = e.target as HTMLInputElement;
        maxInput = parseFloat(target.value);
        if (Number.isNaN(maxInput)) return;
        if (maxInput < minInput) maxInput = minInput;
        if (maxInput < 0) maxInput = 0;
        if (maxInput > 5) maxInput = 5;
        $searchSettings.filters["Rating"].max = maxInput;
    };

    /**
     * Reset search settings to default
     */
    const resetSearchSettings = () => {
        $searchSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        minInput = 0;
        maxInput = 5;
    };
</script>

<Modal {showModal}>
    <div class="p-6 w-[80vw] max-w-4xl">
        <h1 class="text-xl font-bold mb-2">Advanced Search Settings</h1>
        <div class="flex flex-col gap-2">
            <div class="settings-area" id="filters">
                <h2 class="text-lg font-bold mb-2">Filters</h2>
                <div class="flex flex-wrap gap-2">
                    {#each Object.keys($searchSettings.filters) as filter}
                        <Checkpill name={filter} category="filters" />
                    {/each}
                </div>

                <!-- * Filter Specifications -->
                <div class="mt-4">
                    {#if $searchSettings.filters["Rating"].enabled}
                        <div
                            class="border-slate-600/30 mx-8 p-2
                    dark:border-slate-200/30 border-t-2 mt-2">
                            <div class="mb-2 flex items-center gap-4">
                                <h3 class="text-lg font-semibold">Rating</h3>
                                <p class="italic">
                                    Note: courses with no rating correspond to 0
                                </p>
                            </div>
                            <div class="flex flex-wrap items-center gap-2">
                                <input
                                    type="number"
                                    step="0.1"
                                    max="5"
                                    min="0"
                                    bind:value={minInput}
                                    placeholder="Min Rating"
                                    class="p-2 h-10 std-area w-36"
                                    on:input={handleMin} />
                                <span>to</span>
                                <input
                                    type="number"
                                    step="0.1"
                                    max="5"
                                    min="0"
                                    bind:value={maxInput}
                                    placeholder="Max Rating"
                                    class="p-2 h-10 std-area w-36"
                                    on:input={handleMax} />

                                <StdButton
                                    message="Reset"
                                    onClick={() => {
                                        minInput = 0;
                                        maxInput = 5;
                                        $searchSettings.filters["Rating"].min =
                                            0;
                                        $searchSettings.filters["Rating"].max =
                                            5;
                                    }}
                                    scheme="4" />
                            </div>
                        </div>
                    {/if}

                    {#each Object.keys($searchSettings.filters) as filter}
                        {#if $searchSettings.filters[filter].enabled && $searchSettings.filters[filter].hasOwnProperty("values")}
                            <div
                                class="border-slate-600/30 mx-8 p-2
                        dark:border-slate-200/30 border-t-2 mt-2">
                                <div>
                                    {#if filter === "No Conflicts"}
                                        <h3 class="text-lg font-semibold">
                                            No Conflicts
                                        </h3>
                                        <p class="italic mb-2">
                                            "Only Available Sections" displays
                                            only courses that have at least 1
                                            section of every section type
                                            (lecture, precept, etc.) that does
                                            not conflict and is open
                                        </p>
                                    {:else}
                                        <h3 class="text-lg font-semibold mb-2">
                                            {filter}
                                        </h3>
                                    {/if}
                                </div>
                                <div class="flex flex-wrap gap-2">
                                    {#each Object.keys($searchSettings.filters[filter].values) as value}
                                        <Checkpill
                                            name={value}
                                            category={filter} />
                                    {/each}
                                </div>
                                <!-- All and None Buttons-->
                                {#if filter !== "No Conflicts"}
                                    <div class="flex gap-2 mt-4">
                                        <StdButton
                                            message="Check All"
                                            onClick={() => {
                                                Object.keys(
                                                    $searchSettings.filters[
                                                        filter
                                                    ].values
                                                ).forEach(value => {
                                                    $searchSettings.filters[
                                                        filter
                                                    ].values[value] = true;
                                                });
                                            }}
                                            scheme="2" />
                                        <StdButton
                                            message="Check None"
                                            onClick={() => {
                                                Object.keys(
                                                    $searchSettings.filters[
                                                        filter
                                                    ].values
                                                ).forEach(value => {
                                                    $searchSettings.filters[
                                                        filter
                                                    ].values[value] = false;
                                                });
                                            }}
                                            scheme="4" />
                                    </div>
                                {/if}
                            </div>
                        {/if}
                    {/each}
                </div>
            </div>
            <div class="settings-area" id="sort">
                <h2 class="text-lg font-bold mb-2">Sort By</h2>
                <div class="flex flex-wrap gap-2">
                    <!-- <TogTog name="Name" /> -->
                    <TogTog name="Rating" />
                    <TogTog name="Weighted Rating" />
                </div>
            </div>
            <div class="settings-area" id="style">
                <h2 class="text-lg font-bold mb-2">Style</h2>
                <div class="flex flex-wrap gap-2">
                    {#each Object.keys($searchSettings.style) as style}
                        <Checkpill name={style} category="style" />
                    {/each}
                </div>
            </div>
        </div>
        <!-- * End Container -->
        <div
            class="flex gap-2 border-t-2 mt-2 pt-2
        border-zinc-200 dark:border-zinc-600">
            <StdButton
                message="Reset to Default"
                onClick={resetSearchSettings}
                scheme="1" />
            <StdButton message="Close" onClick={saveSettings} />
        </div>
        <!-- * End Nav -->
    </div>
</Modal>

<style lang="postcss">
    .settings-area {
        @apply p-4 border-t-2
    border-slate-600/30 dark:border-slate-200/30;
    }
</style>
