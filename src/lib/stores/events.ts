import { SupabaseClient } from "@supabase/supabase-js";
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

function createEventStore(events: CustomEvent[]) {
    const { subscribe, set, update } = writable(events);

    return {
        subscribe,
        set,
        update,

        /**
         * Add an event to the store and database
         * @param event Event to add
         */
        add: async (supabase: SupabaseClient, event: CustomEvent) => {
            update(events => [...events, event]);
            const { error } = await supabase.from("events").insert(event);
            if (error) {
                console.error("Error adding event to database:", error.message);
                update(events => events.filter(e => e.id !== event.id));
            }
        },

        /**
         * Remove an event from the store and database
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
