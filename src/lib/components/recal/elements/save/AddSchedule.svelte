<script lang="ts">
import Modal from "$lib/components/elements/Modal.svelte";
import { modalStore } from "$lib/stores/modal";
import { currentSchedule, currentTerm, retop, schedules } from "$lib/stores/recal";
import type { SupabaseClient } from "@supabase/supabase-js";

export let showModal: boolean = false;
export let supabase: SupabaseClient;

let input: string = "";

// Save schedule and close modal
const saveSchedule = async () => {
    // Get User
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
        console.log("User not logged in");
        return;
    };

    // Upload to database
    supabase.from("schedules")
        .insert({ 
            title: input, 
            term: $currentTerm,
            user_id: user.id,
        })
        .select("id, title")
    .then(res => {
        if (res.error) {
            console.log(res.error);
            return;
        }

        // Update schedule store
        schedules.update(x => {
            x[$currentTerm] = [...x[$currentTerm], res.data[0]];
            return x;
        });

        // Update current schedule
        currentSchedule.set(res.data[0].id);
        if ($schedules[$currentTerm].length === 1)
            $retop = !$retop;
    });

    // Clean Up and Close
    input = "";
    modalStore.close();
}

</script>
<Modal {showModal}>
    <div class="p-6 w-[80vw] max-w-2xl">
        <h1 class="text-xl font-bold mb-2">Create New Schedule</h1>
        <form on:submit|preventDefault>        
            <div class="flex flex-col gap-2">
                <div class="settings-area" id="name">
                    <h2 class="text-lg font-bold mb-2">Title</h2>
                    <input bind:value={input}
                    type="text" placeholder="Search" name="title"
                    class="flex-1 p-2 h-10 w-full std-area">
                </div>
            </div> <!-- * End Container -->
            <div class="flex gap-2 border-t-2 mt-2 pt-2">
                <button class="btn border-2 border-slate-600/30 flex-1" 
                type="button"
                on:click={() => modalStore.close()}>
                    Cancel
                </button>
                <button class="btn flex-1 bg-gradient-to-r 
                from-deepblue-light to-deepblue-dark text-white"
                type="submit"
                on:click={saveSchedule}>
                    Create
                </button>
            </div> <!-- * End Nav -->
        </form>
    </div>
</Modal>

<style lang="postcss">
.settings-area {
    @apply p-4 border-t-2
    border-slate-600/30 dark:border-slate-200/30;
}

.btn {
    @apply rounded-md py-2 text-center;
}
</style>