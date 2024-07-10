/**
 * @file Stores for custom events and their associations with schedules
 */

import { goto } from "$app/navigation";
import { schedules } from "$lib/changeme";
import { hoveredEvent } from "$lib/scripts/ReCal+/calendar";
import type { SupabaseClient } from "@supabase/supabase-js";
import { get, writable } from "svelte/store";

export type CustomEventTime = {
    start: number;
    end: number;
    days: number;
};

export type UserCustomEvent = {
    id: number;
    title: string;
    times: CustomEventTime[];
};

export type CustomEventInsert = Omit<UserCustomEvent, "id">;

function createCustomEventsStore() {
    const store = writable<UserCustomEvent[]>([]);

    return {
        subscribe: store.subscribe,
        set: store.set,
        update: store.update,

        /**
         * Find an event by its id
         * @param id Id of the event to find
         * @returns The event with the given id, or undefined if not found
         */
        find: (id: number): UserCustomEvent | undefined => {
            const events = get(store);
            return events.find(event => event.id === id);
        },

        /**
         * Add an event to the store and database
         * @param supabase Supabase client
         * @param event Event to add
         * @returns Id of the added event, or -1 on error
         */
        add: async (
            supabase: SupabaseClient,
            event: CustomEventInsert
        ): Promise<number> => {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) {
                goto("/");
                return -1;
            }

            const { data, error } = await supabase
                .from("events")
                .insert({
                    title: event.title,
                    times: event.times,
                    user_id: user.id
                })
                .select("id");

            if (error) {
                console.error("Error adding event to database:", error.message);
                return -1;
            }

            const newEvent: UserCustomEvent = { ...event, id: data[0].id };
            store.update(events => [...events, newEvent]);
            return newEvent.id;
        },

        /**
         * Update an event in the store and database
         * @param supabase Supabase client
         * @param id Id of the event to update
         * @param newData New data for the event
         */
        edit: async (
            supabase: SupabaseClient,
            id: number,
            newData: CustomEventInsert
        ): Promise<boolean> => {
            const events = get(store);
            const eventIndex = events.findIndex(event => event.id === id);
            if (eventIndex === -1) {
                console.error("Event not found");
                return false;
            }

            const event = events[eventIndex];

            store.update(events => [
                ...events.slice(0, eventIndex),
                { ...event, ...newData },
                ...events.slice(eventIndex + 1)
            ]);

            const { error } = await supabase
                .from("events")
                .update({
                    title: newData.title,
                    times: newData.times
                })
                .match({ id });

            if (error) {
                console.error(
                    "Error updating event in database:",
                    error.message
                );
                store.update(events => [
                    ...events.slice(0, eventIndex),
                    event,
                    ...events.slice(eventIndex + 1)
                ]);
                return false;
            }
            return true;
        },

        /**
         * Remove an event from the store and database
         * @param supabase Supabase client
         * @param id Id of the event to remove
         * @returns True if successful, false otherwise
         */
        remove: async (
            supabase: SupabaseClient,
            id: number
        ): Promise<boolean> => {
            const events = get(store);
            const eventIndex = events.findIndex(event => event.id === id);
            if (eventIndex === -1) {
                console.error("Event not found");
                return false;
            }

            const event = events[eventIndex];

            store.update(events => events.filter(event => event.id !== id));

            const { error } = await supabase
                .from("events")
                .delete()
                .match({ id });

            if (error) {
                console.error(
                    "Error removing event from database:",
                    error.message
                );
                store.update(events => [
                    ...events.slice(0, eventIndex),
                    event,
                    ...events.slice(eventIndex)
                ]);
                return false;
            }
            return true;
        },

        /**
         * Check if the event store is at max capacity (100 events)
         * @returns True if the event store is at max capacity, false otherwise
         */
        isAtMax: () => {
            const events = get(store);
            return events.length >= 100;
        }
    };
}

export const customEvents = createCustomEventsStore();

export type ScheduleEventMap = Record<number, number[]>;

function createScheduleEventStore() {
    const store = writable<ScheduleEventMap>({});

    return {
        subscribe: store.subscribe,
        set: store.set,
        update: store.update,

        /**
         * Initialize the store with the given inserts
         * @param inserts Inserts to initialize the store with
         */
        init: (inserts: Record<number, number[]>) => {
            const map: ScheduleEventMap = {};
            for (const scheduleId in inserts) {
                if (!map[scheduleId]) map[scheduleId] = [];
                for (const eventId of inserts[scheduleId]) {
                    const event = customEvents.find(eventId);
                    if (event) map[scheduleId].push(event.id);
                }
            }
            store.set(map);
            console.log("Initialized schedule event map:", map);
        },

        /**
         * Load the events for a term into the store from the database
         * @param supabase Supabase client
         * @param term New term to load
         * @returns True if successful, false otherwise
         */
        loadTerm: async (
            supabase: SupabaseClient,
            term: number
        ): Promise<boolean> => {
            const termSchedules = get(schedules)[term];
            if (!termSchedules) {
                console.error("Term schedules not found while loading term");
                return false;
            }

            const currentEvents = get(store);
            for (const schedule of termSchedules) {
                // If already loaded, skip
                if (currentEvents[schedule.id]) return true;
                store.update(map => {
                    map[schedule.id] = [];
                    return map;
                });
            }

            const { data, error } = await supabase
                .from("event_schedule_associations")
                .select("event_id, schedule_id")
                .in(
                    "schedule_id",
                    termSchedules.map(s => s.id)
                );
            if (error) {
                console.error("Error refreshing schedule event map:", error);
                return false;
            }
            for (const event of data) {
                store.update(map => {
                    if (!map[event.schedule_id]) map[event.schedule_id] = [];
                    map[event.schedule_id].push(event.event_id);
                    return map;
                });
            }
            return true;
        },

        /**
         * Get the events for a schedule
         * @param scheduleId Id of the schedule to get events for
         * @returns Events for the schedule
         */
        getSchedule: (scheduleId: number): UserCustomEvent[] => {
            if (scheduleId === undefined) {
                console.error(
                    "Undefined schedule id while getting schedule events"
                );
                return [];
            }
            const schedule = get(store)[scheduleId];
            if (!schedule) {
                return [];
            }
            const resolvedEvents = schedule
                .map(eventId => customEvents.find(eventId))
                .filter(event => event) as UserCustomEvent[];
            return resolvedEvents || [];
        },

        /**
         * Add an event to a schedule
         * @param supabase Supabase client
         * @param scheduleId Id of the schedule to add the event to
         * @param eventId Id of the event to add
         * @returns True if successful, false otherwise
         */
        addToSchedule: async (
            supabase: SupabaseClient,
            scheduleId: number,
            eventId: number
        ): Promise<boolean> => {
            if (!schedules.includes(scheduleId)) {
                console.error("Schedule does not exist");
                return false;
            }

            const allSchedules = get(store);
            if (!allSchedules[scheduleId]) {
                store.update(map => {
                    map[scheduleId] = [];
                    return map;
                });
            }
            const schedule = allSchedules[scheduleId];

            const event = customEvents.find(eventId);
            if (!event) {
                console.error("Event not found");
                return false;
            }

            if (schedule.find(event => event === eventId)) {
                console.error("Event already in schedule");
                return false;
            }

            store.update(map => {
                map[scheduleId] = [...map[scheduleId], event.id];
                return map;
            });
            hoveredEvent.set(null);

            const { error } = await supabase
                .from("event_schedule_associations")
                .insert({
                    event_id: eventId,
                    schedule_id: scheduleId
                });

            if (error) {
                console.error("Error adding event to schedule:", error.message);
                store.update(map => {
                    map[scheduleId] = map[scheduleId].filter(
                        event => event !== eventId
                    );
                    return map;
                });
                return false;
            }
            return true;
        },

        /**
         * Remove an event from a schedule
         * @param supabase Supabase client
         * @param scheduleId Id of the schedule to remove the event from
         * @param eventId Id of the event to remove
         * @returns True if successful, false otherwise
         */
        removeFromSchedule: async (
            supabase: SupabaseClient,
            scheduleId: number,
            eventId: number
        ): Promise<boolean> => {
            const schedule = get(store)[scheduleId];
            if (!schedule) {
                console.error(
                    "Schedule not found while removing from schedule"
                );
                return false;
            }

            const event = customEvents.find(eventId);
            if (!event) {
                console.error("Event not found");
                return false;
            }

            const eventIndex = schedule.findIndex(event => event === eventId);
            if (eventIndex === -1) {
                console.error("Event not found in schedule");
                return false;
            }

            store.update(map => {
                map[scheduleId] = [
                    ...map[scheduleId].slice(0, eventIndex),
                    ...map[scheduleId].slice(eventIndex + 1)
                ];
                return map;
            });
            hoveredEvent.set(null);

            const { error } = await supabase
                .from("event_schedule_associations")
                .delete()
                .eq("event_id", eventId)
                .eq("schedule_id", scheduleId);

            if (error) {
                console.error(
                    "Error removing event from schedule:",
                    error.message
                );
                store.update(map => {
                    map[scheduleId] = [
                        ...map[scheduleId].slice(0, eventIndex),
                        event.id,
                        ...map[scheduleId].slice(eventIndex)
                    ];
                    return map;
                });
                return false;
            }
            return true;
        },

        /**
         * Clear all events from a schedule
         * @param supabase Supabase client
         * @param scheduleId Id of the schedule to clear
         * @returns True if successful, false otherwise
         */
        clearSchedule: async (
            supabase: SupabaseClient,
            scheduleId: number
        ): Promise<boolean> => {
            const schedule = get(store)[scheduleId];
            if (!schedule) {
                console.error("Schedule not found while clearing");
                return false;
            }

            store.update(map => {
                map[scheduleId] = [];
                return map;
            });

            const { error } = await supabase
                .from("event_schedule_associations")
                .delete()
                .eq("schedule_id", scheduleId);

            if (error) {
                console.error(
                    "Error clearing events from schedule:",
                    error.message
                );
                store.update(map => {
                    map[scheduleId] = schedule;
                    return map;
                });
                return false;
            }
            return true;
        },

        /**
         * Remove an event from all schedules
         * This only removes from the store, not the database
         * When an event is removed, the associations cascade drop,
         * so this function is for that case only
         * @param eventId Id of the event to remove from all schedules
         */
        removeFromAllSchedules: async (eventId: number) => {
            const schedules = get(store);

            for (const scheduleId in schedules) {
                const schedule = schedules[scheduleId];
                const eventIndex = schedule.findIndex(
                    event => event === eventId
                );

                if (eventIndex === -1) continue;

                store.update(map => {
                    map[scheduleId] = [
                        ...map[scheduleId].slice(0, eventIndex),
                        ...map[scheduleId].slice(eventIndex + 1)
                    ];
                    return map;
                });
            }
        },

        /**
         * Remove a schedule and its data from the store and database
         * This only removes from the store, not the database
         * When a schedule is removed, the associations cascade drop,
         * so this function is for that case only
         * @param scheduleId Id of the schedule to remove
         * @returns True if successful, false otherwise
         */
        deleteSchedule: (scheduleId: number) => {
            if (!get(store)[scheduleId]) {
                console.error("Schedule not found while deleting");
                return;
            }

            store.update(map => {
                delete map[scheduleId];
                return map;
            });
        },

        /**
         * Duplicate a schedule's events to another schedule
         * Note: this completely overwrites the target schedule's events
         * @param supabase Supabase client
         * @param sourceId Id of the schedule to copy from
         * @param targetId Id of the schedule to copy to
         */
        duplicateSchedule: async (
            supabase: SupabaseClient,
            sourceId: number,
            targetId: number
        ): Promise<boolean> => {
            const sourceEvents = get(store)[sourceId];
            if (sourceEvents === null) {
                console.error("Source schedule not found while duplicating");
                return false;
            }

            // Source schedule is empty, clear target schedule
            if (sourceEvents.length === 0) {
                store.update(map => {
                    map[targetId] = [];
                    return map;
                });
                return true;
            }

            store.update(map => {
                map[targetId] = sourceEvents;
                return map;
            });

            const { error } = await supabase
                .from("event_schedule_associations")
                .insert(
                    sourceEvents.map(eventId => ({
                        event_id: eventId,
                        schedule_id: targetId
                    }))
                );

            if (error) {
                console.error("Error duplicating schedule:", error.message);
                store.update(map => {
                    delete map[targetId];
                    return map;
                });
            }
            return !error;
        }
    };
}

export const scheduleEventMap = createScheduleEventStore();
export const editEvent = writable<UserCustomEvent | null>(null);
export const deleteCandidateEvent = writable<UserCustomEvent | null>(null);
