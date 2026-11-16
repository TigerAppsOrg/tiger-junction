<script lang="ts">
    import StdButton from "$lib/components/ui/StdButton.svelte";
    import StdModal from "$lib/components/ui/StdModal.svelte";
    import { modalStore } from "$lib/stores/modal";
    import { stellicConflictPrompt } from "$lib/stores/stellic";

    let { showModal = false }: { showModal?: boolean } = $props();

    let prompt = $derived($stellicConflictPrompt);
    let answered = false;

    const choose = (useJunction: boolean) => {
        answered = true;
        const p = $stellicConflictPrompt;
        modalStore.pop();
        p?.answer(useJunction);
    };

    // Closed without choosing (Escape, clicking outside): cancel the export.
    // The same popup instance can show the next conflict right away, so
    // track the answer per prompt.
    $effect(() => {
        const p = $stellicConflictPrompt;
        answered = false;
        return () => {
            if (!answered) p?.answer(null);
        };
    });
</script>

<StdModal title="Schedule conflict in Stellic" stdClose={false} {showModal}>
    {#snippet main()}
        {#if prompt}
            {#if prompt.total > 1}
                <p class="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
                    Conflict {prompt.index + 1} of {prompt.total}
                </p>
            {/if}
            <p>
                Your existing course
                <span class="font-semibold"
                    >{prompt.conflict.existingCode}</span>
                conflicts with your Junction plan for course
                <span class="font-semibold"
                    >{prompt.conflict.junctionCode}</span>
                at <span class="font-semibold">{prompt.conflict.when}</span>. Do
                you want to use the Junction schedule?
            </p>
            <p class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Yes removes {prompt.conflict.existingCode} from Stellic. No keeps
                it and leaves {prompt.conflict.junctionCode} out.
            </p>
        {/if}
    {/snippet}
    {#snippet buttons()}
        <div
            class="mt-2 flex gap-2 border-t-2 border-zinc-200 pt-2
            dark:border-zinc-600">
            <StdButton message="Yes" onClick={() => choose(true)} />
            <StdButton message="No" onClick={() => choose(false)} />
        </div>
    {/snippet}
</StdModal>
