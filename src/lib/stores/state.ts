import { writable, type Writable } from "svelte/store";

export const currentPage = writable("home");

const {
    subscribe,
    update,
    set: setDark
}: Writable<boolean> = writable(
    typeof window !== "undefined" && localStorage.getItem("darkMode") === "true"
);

const darkTheme = {
    subscribe,
    update,
    set: (value: boolean) => {
        setDark(value);
        localStorage.setItem("darkMode", value.toString());
    }
};

export { darkTheme };
