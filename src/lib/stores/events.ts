import { goto } from "$app/navigation";
import { SupabaseClient } from "@supabase/supabase-js";
import { get, writable, type Writable } from "svelte/store";

export type CustomEventTime = {
    start: string;
    end: string;
};

export type CustomEvent = {
    id: number;
    title: string;
    times: CustomEventTime[];
};

export type CustomEventInsert = Omit<CustomEvent, "id">;

function createCustomEventsStore() {
    const store: Writable<CustomEvent[]> = writable([]);

    return {
        subscribe: store.subscribe,
        set: store.set,
        update: store.update,

        find: (id: number) => {
            const events = get(store);
            return events.find(event => event.id === id);
        },

        add: async (supabase: SupabaseClient, event: CustomEventInsert) => {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) {
                goto("/");
                return;
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

            const newEvent: CustomEvent = { ...event, id: data[0].id };
            store.update(events => [...events, newEvent]);
            return newEvent.id;
        },

        remove: async (supabase: SupabaseClient, id: number) => {
            const events = get(store);
            const eventIndex = events.findIndex(event => event.id === id);
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
            }
        }
    };
}

export const customEvents = createCustomEventsStore();

export type ScheduleEventMap = Record<number, CustomEvent[]>;

function createScheduleEventStore() {
    const store: Writable<ScheduleEventMap> = writable({});

    return {
        subscribe: store.subscribe,
        set: store.set,
        update: store.update,

        /**
         * Get the events for a schedule
         * @param scheduleId Id of the schedule to get events for
         * @returns Events for the schedule
         */
        getSchedule: (scheduleId: number) => {
            const schedule = get(store)[scheduleId];
            return schedule || [];
        },

        /**
         * Add an event to a schedule
         * @param supabase Supabase client
         * @param scheduleId Id of the schedule to add the event to
         * @param eventId Id of the event to add
         */
        addToSchedule: async (
            supabase: SupabaseClient,
            scheduleId: number,
            eventId: number
        ) => {},

        /**
         * Remove an event from a schedule
         * @param supabase Supabase client
         * @param scheduleId Id of the schedule to remove the event from
         * @param eventId Id of the event to remove
         */
        removeFromSchedule: async (
            supabase: SupabaseClient,
            scheduleId: number,
            eventId: number
        ) => {},

        /**
         * Clear all events from a schedule
         * @param supabase Supabase client
         * @param scheduleId Id of the schedule to clear
         */
        clearSchedule: async (
            supabase: SupabaseClient,
            scheduleId: number
        ) => {},

        /**
         * Remove an event from all schedules
         * @param supabase Supabase client
         * @param eventId Id of the event to remove from all schedules
         */
        removeFromAllSchedules: async (
            supabase: SupabaseClient,
            eventId: number
        ) => {},

        /**
         * Remove a schedule from the store
         * Warning: This does not remove the schedule from the database
         * It is only to garbage collect from this store once
         * the schedule is deleted. Should be called after the schedule
         * is removed from the database.
         * @param scheduleId Id of the schedule to remove
         */
        deleteSchedule: async (scheduleId: number) => {
            store.update(map => {
                delete map[scheduleId];
                return map;
            });
        }
    };
}

export const scheduleEventMap = createScheduleEventStore();
