import { writable } from "svelte/store";

export type Toast = {
    id: number;
    message: string;
    type: "success" | "error" | "warning" | "info";
};

const { subscribe, update, set } = writable<Toast[]>([]);

export const toastStore = {
    subscribe,
    set,
    update,

    /**
     * Add a toast
     * @param type
     * @param message
     */
    add: (type: Toast["type"], message: string, timeout = 3) => {
        // Generate a random id
        const id = Math.floor(Math.random() * 1000000);

        // Add the toast to the front of the array
        update((toasts: Toast[]) => [{ id, message, type }, ...toasts]);

        // Remove the toast after 3 seconds
        setTimeout(() => toastStore.remove(id), timeout * 1000);
    },

    /**
     * Remove a toast
     * @param id
     */
    remove: (id: number) => {
        update((toasts: Toast[]) =>
            toasts.filter((toast: Toast) => toast.id !== id)
        );
    }
};
