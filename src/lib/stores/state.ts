import { writable } from "svelte/store";

export const currentPage = writable("home");

const {
    subscribe,
    update,
    set: setDark
} = writable<boolean>(
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
