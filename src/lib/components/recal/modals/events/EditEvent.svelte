<script lang="ts">
    import Modal from "$lib/components/ui/Modal.svelte";
    import StdButton from "$lib/components/ui/StdButton.svelte";
    import { modalStore } from "$lib/stores/modal";
    import { toastStore } from "$lib/stores/toast";
    import { SupabaseClient } from "@supabase/supabase-js";
    import { getContext, onMount } from "svelte";
    import {
        dayArrToValue,
        MAX_TIME,
        MAX_TIME_VALUE,
        militaryToValue,
        MIN_TIME,
        MIN_TIME_VALUE,
        valueToDayArr,
        valueToMilitary
    } from "$lib/scripts/convert";
    import { calculateCssVars } from "$lib/stores/styles";
    import { customEvents } from "$lib/stores/events";
    import { editEvent } from "$lib/stores/events";
    import { recal } from "$lib/stores/recal";

    const supabase: SupabaseClient = getContext("supabase");
    export let showModal: boolean = false;

    const DAYS = ["M", "T", "W", "R", "F"];

    let title: string = "";
    let titleError = "";

    type TempTime = {
        start: string | null;
        end: string | null;
        days: string[];
        errors: string[];
    };
    let times: TempTime[] = [];
    let timeBlockError = "";
    let refreshErrors = 0;

    // Save the event in the store and db and close the modal
    const createEvent = async () => {
        if (!validateSubmission()) {
            refreshErrors++;
            return;
        }

        const normalizedTimes = times.map(time => {
            return {
                start: militaryToValue(time.start as string),
                end: militaryToValue(time.end as string),
                days: dayArrToValue(time.days)
            };
        });

        // Upload to database
        const newId = await customEvents.add(supabase, {
            title: title.trim(),
            times: normalizedTimes
        });

        if (newId === -1) {
            titleError = "Server Error: please refresh and try again.";
            return;
        }

        cleanUp();
        modalStore.pop();
        toastStore.add("success", "Event created successfully");
    };

    const saveEvent = async () => {
        if (!validateSubmission()) {
            refreshErrors++;
            return;
        }

        if (!$editEvent) {
            titleError = "Server Error: please refresh and try again.";
            return;
        }

        const normalizedTimes = times.map(time => {
            return {
                start: militaryToValue(time.start as string),
                end: militaryToValue(time.end as string),
                days: dayArrToValue(time.days)
            };
        });

        const status = await customEvents.edit(supabase, $editEvent.id, {
            title: title.trim(),
            times: normalizedTimes
        });

        if (!status) {
            titleError = "Server Error: please refresh and try again.";
            return;
        }

        $recal = !$recal;

        cleanUp();
        modalStore.pop();
        toastStore.add("success", "Event updated successfully");
    };

    const validateSubmission = (): boolean => {
        let isValid = true;

        if (title.length === 0) {
            titleError = "Title is required";
            isValid = false;
        } else if (title.length > 100) {
            titleError = "Title must be less than 100 characters";
            isValid = false;
        }

        for (let i = 0; i < times.length; i++) {
            if (!validateTimes(i)) isValid = false;
            if (times[i].days.length === 0) {
                times[i].errors.push("Must select at least one day");
                isValid = false;
            }
            if (times[i].start === null || times[i].end === null) {
                times[i].errors.push("Start and end times are required");
                isValid = false;
            }
        }

        return isValid;
    };

    const validateTimes = (index: number): boolean => {
        const time = times[index];
        time.errors = [];

        if (time.start !== null) {
            const startValue = militaryToValue(time.start);
            if (startValue < MIN_TIME_VALUE)
                time.errors.push(`Start time must be after ${MIN_TIME}.`);
            if (startValue > MAX_TIME_VALUE)
                time.errors.push(`Start time must be before ${MAX_TIME}.`);
        }

        if (time.end !== null) {
            const endValue = militaryToValue(time.end);
            if (endValue < MIN_TIME_VALUE)
                time.errors.push(`End time must be after ${MIN_TIME}.`);
            if (endValue > MAX_TIME_VALUE)
                time.errors.push(`End time must be before ${MAX_TIME}.`);
        }

        if (time.start !== null && time.end !== null) {
            if (time.start >= time.end)
                time.errors.push("Start time must be before end time.");
        }

        refreshErrors++;
        return time.errors.length === 0;
    };

    const cleanUp = () => {
        title = "";
        times = [
            {
                start: null,
                end: null,
                days: [],
                errors: []
            }
        ];
    };

    onMount(() => {
        // Reset times
        if (!$editEvent) {
            times = [
                {
                    start: null,
                    end: null,
                    days: [],
                    errors: []
                }
            ];
        } else {
            title = $editEvent.title;
            times = $editEvent.times.map(time => {
                return {
                    start: valueToMilitary(time.start),
                    end: valueToMilitary(time.end),
                    days: valueToDayArr(time.days),
                    errors: []
                };
            });
        }
    });

    $: cssVarStyles = calculateCssVars("2");
</script>

<Modal {showModal}>
    <div class="p-6 w-[80vw] max-w-2xl" style={cssVarStyles}>
        <h1 class="text-xl font-bold mb-2">
            {$editEvent ? "Edit Custom Event" : "New Custom Event"}
        </h1>
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
                        on:input={() => (titleError = "")}
                        type="text"
                        placeholder="Title"
                        name="title"
                        class="flex-1 p-2 h-10 w-full std-area rounded-md" />
                </div>
                <div class="settings-area">
                    <div class="flex justify-between items-center">
                        <h2 class="text-lg font-bold">Time Blocks</h2>
                        {#if timeBlockError !== ""}
                            <p class="text-red-500">{timeBlockError}</p>
                        {/if}
                    </div>
                    <p class="mb-2">
                        Times must be in the range of {MIN_TIME} to {MAX_TIME}.
                    </p>
                    {#each times as time, i}
                        <div
                            class="bg-zinc-100 dark:bg-zinc-800
                            rounded-md p-4 relative mt-2">
                            <!-- Delete Button -->
                            <button
                                type="button"
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

                            <!-- Time Select -->
                            <div class="flex gap-6 mb-4">
                                <div class="flex items-center gap-2">
                                    <h2 class="font-bold">Start Time:</h2>
                                    <input
                                        type="time"
                                        bind:value={time.start}
                                        on:change={() => validateTimes(i)}
                                        class="p-2 h-10 w-32 rounded-sm" />
                                </div>
                                <div class="flex items-center gap-2">
                                    <h2 class="font-bold">End Time:</h2>
                                    <input
                                        type="time"
                                        bind:value={time.end}
                                        on:change={() => validateTimes(i)}
                                        class="p-2 h-10 w-32 rounded-sm mr-6" />
                                </div>
                            </div>

                            <!-- Day Select -->
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <h2 class="font-bold">Days:</h2>
                                    {#each DAYS as day}
                                        <button
                                            on:click={() => {
                                                if (time.days.includes(day)) {
                                                    time.days =
                                                        time.days.filter(
                                                            d => d !== day
                                                        );
                                                } else {
                                                    time.days = [
                                                        ...time.days,
                                                        day
                                                    ];
                                                }
                                            }}
                                            class:checked={time.days.includes(
                                                day
                                            )}
                                            type="button"
                                            class="day-toggle">
                                            {day}
                                        </button>
                                    {/each}
                                </div>
                                <div>
                                    {#key refreshErrors}
                                        {#each time.errors as error}
                                            <p class="text-red-500">
                                                {error}
                                            </p>
                                        {/each}
                                    {/key}
                                </div>
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
                                    days: [],
                                    errors: []
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

                {#if $editEvent}
                    <StdButton
                        message="Save"
                        onClick={saveEvent}
                        submit={true} />
                {:else}
                    <StdButton
                        message="Create"
                        onClick={createEvent}
                        submit={true} />
                {/if}
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
        @apply w-8 h-8 rounded-full p-1 duration-100 text-sm select-none
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
