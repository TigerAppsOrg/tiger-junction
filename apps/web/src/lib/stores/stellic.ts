import { writable } from "svelte/store";

/** Result of the last Export to Stellic, shown by the StellicExport modal. */
export type StellicExportResult = {
    added: string[];
    skipped: { code: string; reason: string }[];
    failed: { code: string; reason: string }[];
    prereqWarnings: { code: string; missing: string; message: string }[];
};

export const stellicExportResult = writable<StellicExportResult | null>(null);
