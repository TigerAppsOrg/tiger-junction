import { writable, type Writable } from "svelte/store";

export const isMobile: Writable<boolean> = writable(false);

export const showCal: Writable<boolean> = writable(true);