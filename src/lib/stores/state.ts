import { writable } from "svelte/store";

export const currentPage = writable("home");

export const darkTheme = writable(true);