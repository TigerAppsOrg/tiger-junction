import { writable } from "svelte/store";

export const isMobile = writable<boolean>(false);

export const showCal = writable<boolean>(true);
