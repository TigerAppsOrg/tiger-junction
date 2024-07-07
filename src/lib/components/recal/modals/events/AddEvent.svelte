<script lang="ts">
    import Modal from "$lib/components/ui/Modal.svelte";
    import StdButton from "$lib/components/ui/StdButton.svelte";
    import { modalStore } from "$lib/stores/modal";
    import { toastStore } from "$lib/stores/toast";
    import { SupabaseClient } from "@supabase/supabase-js";
    import { getContext, onMount } from "svelte";
    import { daysToValue, timeToValue } from "$lib/scripts/convert";
    import { calColors, calculateCssVars } from "$lib/stores/styles";

    const supabase: SupabaseClient = getContext("supabase");
    export let showModal: boolean = false;

    const DAYS = ["M", "T", "W", "R", "F"];

    let title: string = "";
    let titleError = "";

    type TempTime = {
        start: string | null;
        end: string | null;
        days: string[];
    };
    let times: TempTime[] = [];
    let timeBlockError = "";

    // Save the event in the store and db and close the modal
    const saveEvent = async () => {
        // Validate input
        if (title.length === 0) {
            titleError = "Title is required";
            return;
        } else if (title.length > 100) {
            titleError = "Title must be less than 100 characters";
            return;
        }

        // Get User
        const user = (await supabase.auth.getUser()).data.user;

        // Upload to database

        // Clean up and close
        title = "";
        modalStore.pop();
        toastStore.add("success", "Event created successfully");
    };

    onMount(() => {
        // Reset times
        times = [
            {
                start: null,
                end: null,
                days: []
            }
        ];
    });

    $: cssVarStyles = calculateCssVars("2", $calColors);
</script>

<Modal {showModal}>
    <div class="p-6 w-[80vw] max-w-2xl" style={cssVarStyles}>
        <h1 class="text-xl font-bold mb-2">Create New Custom Event</h1>
        <form on:submit|preventDefault>
            <div class="flex flex-col gap-2">
                <div class="settings-area">
                    <div class="flex items-cente justify-between">
                        <h2 class="text-lg font-bold mb-2">Title</h2>
                        {#if titleError !== ""}
                            <p class="text-red-500">{titleError}</p>
                        {/if}
                    </div>
                    <input
                        bind:value={title}
                        type="text"
                        placeholder="Title"
                        name="title"
                        class="flex-1 p-2 h-10 w-full std-area rounded-md" />
                </div>
                <div class="settings-area">
                    <div class="flex justify-between items-center">
                        <h2 class="text-lg font-bold mb-2">Time Blocks</h2>
                        {#if timeBlockError !== ""}
                            <p class="text-red-500">{timeBlockError}</p>
                        {/if}
                    </div>
                    {#each times as time, i}
                        <div
                            class="bg-zinc-100 dark:bg-zinc-800
                            rounded-md p-4 relative mt-2">
                            <!-- Delete Button -->
                            <button
                                on:click={() => {
                                    // If only one time block, reset it
                                    if (times.length === 1) {
                                        timeBlockError =
                                            "Must have at least one time block";
                                    } else {
                                        timeBlockError = "";
                                        times = times.filter(
                                            (_, index) => index !== i
                                        );
                                    }
                                }}
                                class="absolute top-2 right-2 text-zinc-700
                                hover:text-zinc-800 dark:text-zinc-200
                                hover:dark:text-zinc-100">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke-width="1.5"
                                    stroke="currentColor"
                                    class="w-6 h-6">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                </svg>
                            </button>
                            <!-- Start Time -->
                            <div></div>

                            <!-- End Time -->
                            <div></div>

                            <!-- Day Select -->
                            <div class="flex items-center gap-2">
                                <h2 class="text-lg mr-2">Days:</h2>
                                {#each DAYS as day}
                                    <button
                                        on:click={() => {
                                            if (time.days.includes(day)) {
                                                time.days = time.days.filter(
                                                    d => d !== day
                                                );
                                            } else {
                                                time.days = [...time.days, day];
                                            }
                                        }}
                                        class:checked={time.days.includes(day)}
                                        type="button"
                                        class="day-toggle">
                                        {day}
                                    </button>
                                {/each}
                            </div>
                        </div>
                    {/each}
                    <StdButton
                        className="w-full mt-2"
                        message="Add Time Block"
                        onClick={() => {
                            if (times.length === 10) {
                                timeBlockError = "Maximum of 10 time blocks";
                                return;
                            }
                            timeBlockError = "";

                            times = [
                                ...times,
                                {
                                    start: null,
                                    end: null,
                                    days: []
                                }
                            ];
                        }}
                        scheme="2" />
                </div>
            </div>
            <div
                class="flex gap-2 border-t-2 mt-2 pt-2
            border-zinc-200 dark:border-zinc-600">
                <StdButton
                    message="Cancel"
                    onClick={() => modalStore.pop()}
                    scheme="-1" />

                <StdButton message="Create" onClick={saveEvent} submit={true} />
            </div>
        </form>
    </div>
</Modal>

<style lang="postcss">
    .settings-area {
        @apply p-4 border-t-2
    border-slate-600/30 dark:border-slate-200/30;
    }

    .day-toggle {
        @apply w-8 h-8 rounded-full p-1 duration-100 text-sm 
        border-2 border-zinc-600/30 dark:border-zinc-200/30;
    }

    .day-toggle:hover {
        @apply bg-zinc-200 dark:bg-zinc-700 border-zinc-600/30
        dark:border-zinc-200/30;
    }

    .checked {
        color: var(--text);
        background-color: var(--bg);
        border-color: var(--bg);
    }

    .checked:hover {
        background-color: var(--bg-hover);
    }
</style>
