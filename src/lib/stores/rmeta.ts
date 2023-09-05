import { writable, type Writable } from "svelte/store";

export type RMetadata = {
    complete: boolean,
    color: number,
    sections: string[],
    confirms: Record<string, number>,
}

// Map from schedule_id -> course_id -> metadata
const { set, update, subscribe }: Writable<
    Record<number, Record<number, RMetadata>>
> = writable({});

export const rMeta = {
    set,
    update,
    subscribe,
}