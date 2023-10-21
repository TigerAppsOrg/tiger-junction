<script lang="ts">
import Modal from "$lib/components/elements/Modal.svelte";
import { modalStore } from "$lib/stores/modal";
import { currentSchedule, currentTerm, retop, schedules, searchCourseData } from "$lib/stores/recal";
import { pinnedCourses, savedCourses } from "$lib/stores/rpool";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toastStore } from "$lib/stores/toast";
    import StdButton from "$lib/components/elements/StdButton.svelte";

export let showModal: boolean = false;
export let supabase: SupabaseClient;

let input: string = "";

// Save schedule and close modal
const saveSchedule = async () => {
    // Check that input is valid
    if (input.length === 0) {
        toastStore.add("error", "Please enter a title");
        return;
    } else if (input.length > 100) {
        toastStore.add("error", "Title must be less than 100 characters");
        return;
    }

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
            toastStore.add("error", "Error: please refresh and try again.");
            return;
        }

        // Update schedule store
        schedules.update(x => {
            x[$currentTerm] = [...x[$currentTerm], res.data[0]];
            return x;
        });

        let newId = res.data[0].id;

        // ! TODO Bandage
        savedCourses.update(x => {
            x[newId] = [];
            return x;
        });

        pinnedCourses.update(x => {
            x[newId] = [];
            return x;
        }); 

        // Update current schedule
        currentSchedule.set(newId);
        searchCourseData.reset($currentTerm);
        let courses = [...$savedCourses[newId], ...$pinnedCourses[newId]];
        searchCourseData.remove($currentTerm, courses);

        if ($schedules[$currentTerm].length === 1)
            $retop = !$retop;

        toastStore.add("success", "Schedule successfully created!");
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
                <button class="btn border-2 border-slate-600/30 flex-1
                hover:bg-slate-200/30 dark:hover:bg-slate-600/30 duration-150" 
                type="button"
                on:click={() => modalStore.close()}>
                    Cancel
                </button>

                <StdButton message="Create" onClick={saveSchedule} />
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