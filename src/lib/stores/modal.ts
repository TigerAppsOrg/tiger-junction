/**
 * @file Stack-based store for managing modals
 * Pairs with the ModalLib.svelte component to render modals
 */

import { writable } from "svelte/store";

function createModalStore() {
    let stack: string[] = [];
    const store = writable<string | undefined>(undefined);

    return {
        subscribe: store.subscribe,
        set: store.set,
        update: store.update,

        /**
         * Push a modal to the stack
         * @param name of the modal
         */
        push: (name: string) => {
            stack.push(name);
            store.set(name);
        },

        /**
         * Pop the current modal from the stack
         */
        pop: () => {
            stack.pop();
            if (stack.length === 0) {
                store.set(undefined);
            } else {
                store.set(stack[stack.length - 1]);
            }
        },

        /**
         * Clear the modal stack
         */
        clear: () => {
            stack = [];
            store.set(undefined);
        },

        /**
         * Get the modal stack
         * @returns The modal stack
         */
        getStack: () => stack
    };
}

export const modalStore = createModalStore();
