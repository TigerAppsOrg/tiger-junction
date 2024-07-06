/**
 * @file Store for custom events and their association with schedules
 */

import { goto } from "$app/navigation";
import { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "@sveltejs/kit";
import { writable } from "svelte/store";

export type CustomEventTime = {
    start: string;
    end: string;
};

export type CustomEvent = {
    id: number;
    title: string;
    times: CustomEventTime[];
};

export type CustomEventInsert = {
    title: string;
    times: CustomEventTime[];
};

function createEventStore(events: CustomEvent[]) {
    const { subscribe, set, update } = writable(events);

    return {
        subscribe,
        set,
        update,

        /**
         *
         * @param id
         * @returns
         */
        find: (id: number) => events.find(event => event.id === id),

        /**
         * Add an event to the store and database
         * @param supabase Supabase client
         * @param event Event to add
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
            const newEvent = { ...event, id: data[0].id };
            update(events => [...events, newEvent]);
            return newEvent.id;
        },

        // eddd163b-7d7d-4269-acd8-3cc03b4cf79f

        /**
         * Remove an event from the store and database
         * @param supabase Supabase client
         * @param id Id of the event to remove
         */
        remove: async (supabase: SupabaseClient, id: number) => {
            const eventIndex = events.findIndex(event => event.id === id);
            const event = events[eventIndex];
            update(events => events.filter(event => event.id !== id));
            const { error } = await supabase
                .from("events")
                .delete()
                .match({ id });
            if (error) {
                console.error(
                    "Error removing event from database:",
                    error.message
                );
                update(events => [
                    ...events.slice(0, eventIndex),
                    event,
                    ...events.slice(eventIndex)
                ]);
            }
        }
    };
}
export const eventData = createEventStore([]);

export type ScheduleEventMap = Record<number, CustomEvent[]>;

function createScheduleEventStore(initMap: ScheduleEventMap) {
    const { subscribe, set, update } = writable(initMap);

    return {
        subscribe,
        set,
        update,

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
            update(map => {
                delete map[scheduleId];
                return map;
            });
        }
    };
}

export const scheduleEventMap = createScheduleEventStore({});
