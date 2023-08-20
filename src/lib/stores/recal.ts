import { writable, type Writable } from "svelte/store";

// Current term id
export const currentTerm: Writable<number> = writable(1242);

// Current schedule index
export const currentSchedule: Writable<number> = writable(0);