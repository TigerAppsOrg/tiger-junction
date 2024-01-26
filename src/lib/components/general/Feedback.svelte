<script lang="ts">
import StdModal from "$lib/components/elements/StdModal.svelte";
import type { SupabaseClient } from "@supabase/supabase-js";
import StdButton from "../elements/StdButton.svelte";
import { toastStore } from "$lib/stores/toast";
import { EMAIL_LIST_FORM_LINK } from "$lib/constants";

export let supabase: SupabaseClient;
export let showModal: boolean = false;

let feedback: string = "";
let isError: boolean = false;

// Submit feedback to the database
const submitFeedback = () => {
    if (feedback.trim() === "") {
        isError = true;
        return;
    }

    supabase.from("feedback").insert({
        feedback: feedback.trim()
    }).then(() => {
        showModal = false;
        toastStore.add("success", "Feedback submitted!");
    });
}
</script>

<StdModal title="Feedback" stdClose={true} {showModal}>
    <div slot="main">
        <div>
            <p class="mb-2">
                Please leave any feedback you have about TigerJunction here.
                This can be anything from a bug report to a feature request.
                Feedback is anonymous, but if you would like a response,
                please leave your email somewhere in the message.
                All feedback is greatly appreciated!
                If you would like monthly updates, please join our email list <a href={EMAIL_LIST_FORM_LINK}
                target="_blank"
                class="underline hover:opacity-80">here</a>!
            </p>
            {#if isError}
                <p class="text-red-500">Feedback cannot be empty!</p>
            {/if}
            <textarea cols="30" rows="10" bind:value={feedback}
            class="w-full p-2 rounded-sm border-2 dark:bg-zinc-900
            border-zinc-300 dark:border-zinc-700"></textarea>
        </div>
        <StdButton message="Submit" className="w-full" scheme="1"
        onClick={submitFeedback} />
    </div>
</StdModal>