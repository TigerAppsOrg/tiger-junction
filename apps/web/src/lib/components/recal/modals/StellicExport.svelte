<script lang="ts">
    import StdModal from "$lib/components/ui/StdModal.svelte";
    import { stellicExportResult } from "$lib/stores/stellic";

    let { showModal = false }: { showModal?: boolean } = $props();

    let result = $derived($stellicExportResult);
    let warned = $derived(
        new Set(result?.prereqWarnings.map(w => w.code) ?? [])
    );
    let cleanlyAdded = $derived(
        result?.added.filter(c => !warned.has(c)) ?? []
    );
</script>

<StdModal title="Exported to Stellic" {showModal}>
    {#snippet main()}
        {#if result}
            <div class="flex flex-col gap-4">
                {#if result.prereqWarnings.length}
                    <section
                        class="rounded-sm border-2 border-amber-400 bg-amber-50
                        p-3 dark:border-amber-500 dark:bg-amber-950">
                        <h2 class="mb-1 font-semibold">
                            Added, but prerequisites not met
                        </h2>
                        <p
                            class="mb-2 text-sm text-zinc-600 dark:text-zinc-300">
                            These are in your Stellic plan, but Stellic says you
                            haven't taken their prerequisites yet.
                        </p>
                        <ul class="flex flex-col gap-1">
                            {#each result.prereqWarnings as w}
                                <li>
                                    <span class="font-semibold">{w.code}</span>
                                    needs
                                    <span class="font-semibold"
                                        >{w.missing}</span>
                                </li>
                            {/each}
                        </ul>
                    </section>
                {/if}

                {#if cleanlyAdded.length}
                    <section>
                        <h2 class="font-semibold">Added</h2>
                        <p>{cleanlyAdded.join(", ")}</p>
                    </section>
                {/if}

                {#if result.skipped.length}
                    <section>
                        <h2 class="font-semibold">Already in your plan</h2>
                        <p>{result.skipped.map(s => s.code).join(", ")}</p>
                    </section>
                {/if}

                {#if result.failed.length}
                    <section>
                        <h2
                            class="font-semibold text-red-600 dark:text-red-400">
                            Not added
                        </h2>
                        <ul class="flex flex-col gap-1">
                            {#each result.failed as f}
                                <li>
                                    <span class="font-semibold">{f.code}</span>: {f.reason}
                                </li>
                            {/each}
                        </ul>
                    </section>
                {/if}
            </div>
        {/if}
    {/snippet}
</StdModal>
