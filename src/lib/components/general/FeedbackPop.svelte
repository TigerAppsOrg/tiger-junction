<script lang="ts">
    import StdModal from "$lib/components/ui/StdModal.svelte";
    import { toastStore } from "$lib/stores/toast";
    import type { SupabaseClient } from "@supabase/supabase-js";
    import { getStyles } from "$lib/stores/styles";
    import { getContext } from "svelte";

    export let showModal: boolean = false;
    const supabase = getContext("supabase") as SupabaseClient;

    let feedback: string = "";
    let isError: boolean = false;

    // Submit feedback to the database
    const submitFeedback = () => {
        if (feedback.trim() === "") {
            isError = true;
            return;
        }

        supabase
            .from("feedback")
            .insert({
                feedback: feedback.trim()
            })
            .then(() => {
                showModal = false;
                toastStore.add("success", "Feedback submitted, thank you!!!");
            });
    };

    const declineFeedback = () => {
        showModal = false;
    };

    $: declineStyle = getStyles("-1");
    $: submitStyle = getStyles("0");
</script>

<StdModal title="TigerJunction needs feedback!" stdClose={false} {showModal}>
    <div slot="main">
        <div>
            <p class="mb-2">
                With the original
                <strong>ReCal retiring at the end of the semester</strong>, we
                would love to hear your feedback on TigerJunction ReCal+.
                Anything at all is appreciated -- be it feature suggestions,
                problems you face, or just your overall impressions. It only
                takes a moment to fill out, but it provides us with monumental
                help. Thank you for being an essential part of this project!
                🐯🧡
            </p>
            <p class="mb-2 italic">
                All feedback is anonymous. If you would like a response, please
                write your email in the message.
            </p>
            {#if isError}
                <p class="text-red-500">Feedback cannot be empty!</p>
            {/if}
            <textarea
                cols="30"
                rows="10"
                bind:value={feedback}
                class="w-full p-2 rounded-sm border-2 dark:bg-zinc-900
            border-zinc-300 dark:border-zinc-700"></textarea>
        </div>
    </div>
    <div class="flex gap-2 w-full items-center" slot="buttons">
        <button
            class="w-1/3 min-w-24"
            on:click={declineFeedback}
            style={declineStyle}>
            Decline :(
        </button>
        <button class="flex-1" on:click={submitFeedback} style={submitStyle}>
            Submit
        </button>
    </div>
</StdModal>

<style lang="postcss">
    button {
        @apply rounded-md py-2 px-4 text-center duration-150;
        background-color: var(--bg);
        color: var(--text);
    }

    button:hover {
        @apply cursor-pointer;
        background-color: var(--bg-hover);
    }
</style>
