<script lang="ts">
    import StdModal from "$lib/components/elements/StdModal.svelte";
    import type { SupabaseClient } from "@supabase/supabase-js";
    import StdButton from "../elements/StdButton.svelte";
    import { toastStore } from "$lib/stores/toast";
    import { EMAIL_LIST_FORM_LINK } from "$lib/constants";
    import { getContext } from "svelte";
    import { goto } from "$app/navigation";

    const supabase = getContext("supabase") as SupabaseClient;
    export let showModal: boolean = false;

    let feedback: string = "";
    let isError: boolean = false;

    // Submit feedback to the database
    const submitFeedback = async () => {
        if (feedback.trim() === "") {
            isError = true;
            return;
        }

        const user = (await supabase.auth.getUser()).data.user;
        if (!user) {
            goto("/");
            return;
        }

        supabase
            .from("feedback")
            .insert({
                feedback: feedback.trim(),
                user_id: user.id
            })
            .then(() => {
                showModal = false;
                toastStore.add("success", "Feedback submitted!");
            });
    };
</script>

<StdModal title="Feedback" stdClose={true} {showModal}>
    <div slot="main">
        <div>
            <p class="mb-2">
                We always love to hear any feedback about TigerJunction! Whether
                positive or negative, please try to include details about what
                you like or dislike so we can improve the platform. Thank you
                for being an essential part of this project!
            </p>
            <p class="mb-2 italic">
                Responses are not anonymous so that we can follow up with you if
                necessary. If you would like monthly updates, please join our
                email list <a
                    href={EMAIL_LIST_FORM_LINK}
                    target="_blank"
                    class="underline hover:opacity-80">here</a
                >!
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
        <StdButton
            message="Submit"
            className="w-full"
            scheme="1"
            onClick={submitFeedback} />
    </div>
</StdModal>
