import { writable, type Writable } from "svelte/store";

let queue: string[] = [];
let currentModal: string | undefined = undefined;
const { subscribe, update, set }: Writable<string | undefined> =
    writable(undefined);

type ModalSettings = {
    front?: boolean; // Put the modal in front of the queue
    force?: boolean; // Force the modal to open
    current?: boolean; // Push the current modal to the queue
    clear?: boolean; // Clear the queue before opening the modal
};

const modalStore = {
    subscribe,
    set,
    update,

    /**
     * Open a modal or add it to the queue (or follow optional settings)
     * @param name of the modal
     * @param settings
     */
    open: (name: string, settings?: ModalSettings) => {
        const { front, force, clear, current } = settings || {};
        if (clear) {
            queue = [];
            currentModal = undefined;
        }

        // Push the current modal to the queue
        if (current && currentModal) queue.push(currentModal);

        // Add the current modal to the queue
        if (front) queue.push(name);
        else queue.unshift(name);

        // Set the current modal
        if (force || !currentModal) setModal();
    },

    /**
     * Close the current modal (and optionally clear the queue)
     * @param clear Clear the queue before closing the modal
     */
    close: (clear?: boolean) => {
        if (clear) queue = [];

        // Set the current modal
        setModal();
    },

    /**
     * Get the queue
     * @returns the current queue
     */
    getQueue: () => queue
};

// Set the current modal to the last item in the queue
const setModal = () => {
    currentModal = queue.pop();
    set(currentModal);
};

export { modalStore };
