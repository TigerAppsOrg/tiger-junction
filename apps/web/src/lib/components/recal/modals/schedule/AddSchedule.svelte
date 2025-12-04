<script lang="ts">
    import Modal from "$lib/components/ui/Modal.svelte";
    import { modalStore } from "$lib/stores/modal";
    import {
        currentSchedule,
        retop,
        searchCourseData
    } from "$lib/stores/recal";
    import { currentTerm, schedules } from "$lib/changeme";
    import { savedCourses } from "$lib/stores/rpool";
    import type { SupabaseClient } from "@supabase/supabase-js";
    import { toastStore } from "$lib/stores/toast";
    import StdButton from "$lib/components/ui/StdButton.svelte";
    import { getContext } from "svelte";
    import { goto } from "$app/navigation";

    let { showModal = false }: { showModal?: boolean } = $props();
    const supabase = getContext("supabase") as SupabaseClient;

    let input: string = $state("");

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
            goto("/");
            return;
        }

        // Get next display order
        const nextOrder = $schedules[$currentTerm].length;

        // Upload to database
        supabase
            .from("schedules")
            .insert({
                title: input.trim(),
                term: $currentTerm,
                user_id: user.id,
                display_order: nextOrder
            })
            .select("id, title, display_order")
            .then(res => {
                if (res.error) {
                    console.log(res.error);
                    toastStore.add(
                        "error",
                        "Error: please refresh and try again."
                    );
                    return;
                }

                // Update schedule store
                schedules.update(x => {
                    x[$currentTerm] = [
                        ...x[$currentTerm],
                        {
                            id: res.data[0].id,
                            title: res.data[0].title,
                            displayOrder: res.data[0].display_order
                        }
                    ];
                    return x;
                });

                let newId = res.data[0].id;

                // ! TODO Bandage
                savedCourses.update(x => {
                    x[newId] = [];
                    return x;
                });

                // Update current schedule
                currentSchedule.set(newId);
                searchCourseData.reset($currentTerm);
                let courses = [...$savedCourses[newId]];
                searchCourseData.remove($currentTerm, courses);

                if ($schedules[$currentTerm].length === 1) $retop = !$retop;

                toastStore.add("success", "Schedule successfully created!");
            });

        // Clean Up and Close
        input = "";
        modalStore.pop();
    };
</script>

<Modal {showModal}>
    <div class="p-6 w-[80vw] max-w-2xl">
        <h1 class="text-xl font-bold mb-2">Create New Schedule</h1>
        <form onsubmit={(e: Event) => e.preventDefault()}>
            <div class="flex flex-col gap-2">
                <div class="settings-area" id="name">
                    <h2 class="text-lg font-bold mb-2">Title</h2>
                    <input
                        bind:value={input}
                        type="text"
                        placeholder="Search"
                        name="title"
                        class="flex-1 p-2 h-10 w-full std-area rounded-md" />
                </div>
            </div>
            <!-- * End Container -->
            <div
                class="flex gap-2 border-t-2 mt-2 pt-2
            border-zinc-200 dark:border-zinc-600">
                <StdButton
                    message="Cancel"
                    onClick={() => modalStore.pop()}
                    scheme="-1" />

                <StdButton
                    message="Create"
                    onClick={saveSchedule}
                    submit={true} />
            </div>
            <!-- * End Nav -->
        </form>
    </div>
</Modal>

<style lang="postcss">
    .settings-area {
        @apply p-4 border-t-2
    border-zinc-600/30 dark:border-zinc-200/30;
    }
</style>
