/**
 * @file Store for managing side panel state
 */

import { writable } from "svelte/store";

export type PanelType = "theme" | null;

function createPanelStore() {
    const { subscribe, set } = writable<PanelType>(null);

    return {
        subscribe,
        open: (panel: PanelType) => set(panel),
        close: () => set(null)
    };
}

export const panelStore = createPanelStore();
