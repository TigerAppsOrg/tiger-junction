<script lang="ts">
import Modal from "$lib/components/elements/Modal.svelte";
import StdButton from "$lib/components/elements/StdButton.svelte";
import { modalStore } from "$lib/stores/modal";
import { currentSchedule, currentTerm, schedules, searchCourseData } from "$lib/stores/recal";
import { rMeta } from "$lib/stores/rmeta";
import { pinnedCourses, savedCourses } from "$lib/stores/rpool";
import { toastStore } from "$lib/stores/toast";
import type { SupabaseClient } from "@supabase/supabase-js";
import { onMount } from "svelte";

export let showModal: boolean = false;
export let supabase: SupabaseClient;

let input: string = "";

onMount(() => {
    let schedule = $schedules[$currentTerm].find(x => 
        x.id === $currentSchedule);
    if (schedule) input = schedule.title;
})

/**
 * Duplicate schedule and close modal
 */
const duplicateSchedule = async () => {
    // Get User
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
        console.log("User not logged in");
        return;
    };

    let newTitle: string;
    let schedule = $schedules[$currentTerm].find(x => 
        x.id === $currentSchedule);
    if (schedule && schedule.title === input.trim()) {
        newTitle = input.trim() + " (Copy)";
    } else {
        newTitle = input.trim();
    }

    if (newTitle.length > 100) {
        newTitle = newTitle.substring(0, 100);
    }

    // Upload to database
    supabase.from("schedules")
        .insert({ 
            title: newTitle, 
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

        // Update course schedule associations
        let saved = $savedCourses[$currentSchedule];
        let pinned = $pinnedCourses[$currentSchedule];        
        let meta = $rMeta[$currentSchedule];

        let newId = res.data[0].id.toString();

        let assocUploads = [];
        for (let i = 0; i < saved.length; i++) assocUploads.push({
            schedule_id: newId,
            course_id: saved[i].id,
            is_pinned: false,
            metadata: meta[saved[i].id],
        });
        
        for (let i = 0; i < pinned.length; i++) assocUploads.push({
            schedule_id: newId,
            course_id: pinned[i].id,
            is_pinned: true,
            metadata: meta[pinned[i].id],
        });

        // Update stores 
        savedCourses.update(x => {
            x[newId] = saved;
            return x;
        });

        pinnedCourses.update(x => {
            x[newId] = pinned;
            return x;
        });

        if (assocUploads.length === 0) {
            currentSchedule.set(parseInt(newId));
            toastStore.add("success", "Schedule successfully duplicated!");
            return;
        }

        // Deep copy
        rMeta.update(x => {
            x[newId] = JSON.parse(JSON.stringify(meta));
            return x;
        });

        // Upload to database
        supabase.from("course_schedule_associations")
            .insert(assocUploads)
            .select("schedule_id, course_id, is_pinned, metadata")
        .then(res2 => {
            // Revert if error
            if (res2.error) {
                console.log(res2.error);
                schedules.update(x => {
                    x[$currentTerm] = x[$currentTerm].filter(x => 
                        x.id !== newId);
                    return x;
                });
                savedCourses.update(x => {
                    delete x[newId];
                    return x;
                });
                pinnedCourses.update(x => {
                    delete x[newId];
                    return x;
                });
                rMeta.update(x => {
                    delete x[newId];
                    return x;
                });

                toastStore.add("error", "Error: please refresh and try again.");
                return;
            }

            // Update current schedule
            currentSchedule.set(res.data[0].id);
                searchCourseData.reset($currentTerm);
                let courses = [...$savedCourses[res.data[0].id], ...$pinnedCourses[res.data[0].id]];
                searchCourseData.remove($currentTerm, courses);
            

            toastStore.add("success", "Schedule successfully duplicated!");
        });
    });

    // Clean Up and Close
    input = "";
    modalStore.close();
}

/**
 * Delete schedule and close modal
 */
const deleteSchedule = async () => {
    // Update database
    supabase.from("schedules")
        .delete()
        .match({ id: $currentSchedule })
    .then(res => {
        if (res.error) {
            console.log(res.error);
            toastStore.add("error", "Error: please refresh and try again.");
            return;
        }

        // Update schedule store
        schedules.update(x => {
            x[$currentTerm] = x[$currentTerm].filter(x => 
                x.id !== $currentSchedule);
            return x;
        });

        // Update current schedule
        currentSchedule.set($schedules[$currentTerm][0].id);

        toastStore.add("success", "Schedule successfully deleted!");
    });

    // Clean Up and Close
    input = "";
    modalStore.close();
}

/**
 * Save schedule and close modal
 */
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

    // Update database
    supabase.from("schedules")
        .update({ 
            title: input.trim(), 
        })
        .match({ id: $currentSchedule })
        .select("id, title")
    .then(res => {
        if (res.error) {
            console.log(res.error);
            toastStore.add("error", "Error: please refresh and try again.");
            return;
        }

        // Update schedule store
        schedules.update(x => {
            let index = x[$currentTerm].findIndex(x => 
                x.id === $currentSchedule);
            x[$currentTerm][index] = res.data[0];
            return x;
        });
    });

    // Clean Up and Close
    input = "";
    modalStore.close();
}

</script>

<Modal {showModal}>
    <div class="p-6 w-[80vw] max-w-2xl">
        <h1 class="text-xl font-bold mb-2">Edit Schedule</h1>
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

                <StdButton message="Cancel" onClick={() => modalStore.close()} 
                scheme="-1" />

                <!-- Hidden Button for Enter Submission -->
                <button type="submit" class="default" 
                on:click={saveSchedule}>
                </button>

                <!-- Disallow delete if only 1 schedule -->
                {#if $schedules[$currentTerm].length > 1}
                <StdButton message="Delete" onClick={deleteSchedule} 
                scheme="4" submit={true} />
                {/if}
            
                <StdButton message="Duplicate" onClick={duplicateSchedule} 
                scheme="2" submit={true} />

                <StdButton message="Save" onClick={saveSchedule}
                submit={true} />
            </div> <!-- * End Nav -->
        </form>
    </div>
</Modal>

<style lang="postcss">
.settings-area {
    @apply p-4 border-t-2
    border-zinc-600/30 dark:border-zinc-200/30;
}

.default {
    position: absolute;
    left: -100%;
}
</style>