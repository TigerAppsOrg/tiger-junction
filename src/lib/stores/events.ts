import { goto } from "$app/navigation";
import { schedules } from "$lib/changeme";
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

        /**
         * Find an event by its id
         * @param id Id of the event to find
         * @returns The event with the given id, or undefined if not found
         */
        find: (id: number): CustomEvent | undefined => {
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

            const newEvent: CustomEvent = { ...event, id: data[0].id };
            store.update(events => [...events, newEvent]);
            return newEvent.id;
        },

        /**
         * Remove an event from the store and database
         * @param supabase Supabase client
         * @param id Id of the event to remove
         */
        remove: async (supabase: SupabaseClient, id: number) => {
            const events = get(store);
            const eventIndex = events.findIndex(event => event.id === id);
            if (eventIndex === -1) {
                console.error("Event not found");
                return;
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
         * Initialize the store with the given inserts
         * @param inserts Inserts to initialize the store with
         */
        init: (inserts: Record<number, number[]>) => {
            const map: ScheduleEventMap = {};
            for (const scheduleId in inserts) {
                if (!map[scheduleId]) map[scheduleId] = [];
                for (const eventId of inserts[scheduleId]) {
                    const event = customEvents.find(eventId);
                    if (event) map[scheduleId].push(event);
                }
            }
            store.set(map);
        },

        /**
         * Get the events for a schedule
         * @param scheduleId Id of the schedule to get events for
         * @returns Events for the schedule
         */
        getSchedule: (scheduleId: number) => {
            const schedule = get(store)[scheduleId];
            if (!schedule) {
                console.error("Schedule not found");
                return [];
            }
            return schedule;
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
        ) => {
            if (!schedules.includes(scheduleId)) {
                console.error("Schedule does not exist");
                return;
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
                return;
            }

            if (schedule.find(event => event.id === eventId)) {
                console.error("Event already in schedule");
                return;
            }

            store.update(map => {
                map[scheduleId] = [...map[scheduleId], event];
                return map;
            });

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
                        event => event.id !== eventId
                    );
                    return map;
                });
            }
        },

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
        ) => {
            const schedule = get(store)[scheduleId];
            if (!schedule) {
                console.error("Schedule not found");
                return;
            }

            const event = customEvents.find(eventId);
            if (!event) {
                console.error("Event not found");
                return;
            }

            const eventIndex = schedule.findIndex(
                event => event.id === eventId
            );
            if (eventIndex === -1) {
                console.error("Event not found in schedule");
                return;
            }

            store.update(map => {
                map[scheduleId] = [
                    ...map[scheduleId].slice(0, eventIndex),
                    ...map[scheduleId].slice(eventIndex + 1)
                ];
                return map;
            });

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
                        event,
                        ...map[scheduleId].slice(eventIndex)
                    ];
                    return map;
                });
            }
        },

        /**
         * Clear all events from a schedule
         * @param supabase Supabase client
         * @param scheduleId Id of the schedule to clear
         */
        clearSchedule: async (supabase: SupabaseClient, scheduleId: number) => {
            const schedule = get(store)[scheduleId];
            if (!schedule) {
                console.error("Schedule not found");
                return;
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
            }
        },

        /**
         * Remove an event from all schedules
         * @param supabase Supabase client
         * @param eventId Id of the event to remove from all schedules
         */
        removeFromAllSchedules: async (
            supabase: SupabaseClient,
            eventId: number
        ) => {
            const schedules = get(store);
            const event = customEvents.find(eventId);

            if (!event) {
                console.error("Event not found");
                return;
            }

            for (const scheduleId in schedules) {
                const schedule = schedules[scheduleId];
                const eventIndex = schedule.findIndex(
                    event => event.id === eventId
                );

                if (eventIndex === -1) continue;

                store.update(map => {
                    map[scheduleId] = [
                        ...map[scheduleId].slice(0, eventIndex),
                        ...map[scheduleId].slice(eventIndex + 1)
                    ];
                    return map;
                });

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
                            event,
                            ...map[scheduleId].slice(eventIndex)
                        ];
                        return map;
                    });
                }
            }
        },

        /**
         * Remove a schedule from the store
         * Warning: This does not remove the schedule from the database
         * It is only to garbage collect from this store once
         * the schedule is deleted. Should be called after the schedule
         * is removed from the database.
         * @param scheduleId Id of the schedule to remove
         */
        deleteSchedule: async (scheduleId: number) => {
            if (!get(store)[scheduleId]) {
                console.error("Schedule not found");
                return;
            }

            store.update(map => {
                delete map[scheduleId];
                return map;
            });
        }
    };
}

export const scheduleEventMap = createScheduleEventStore();
