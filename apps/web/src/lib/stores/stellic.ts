import { writable } from "svelte/store";

/** Result of the last Export to Stellic, shown by the StellicExport modal. */
export type StellicExportResult = {
    added: string[];
    skipped: { code: string; reason: string }[];
    failed: { code: string; reason: string }[];
    prereqWarnings: { code: string; missing: string; message: string }[];
    replaced: { code: string; by: string }[];
    keptExisting: { code: string; conflictsWith: string }[];
    sectionNotes: { code: string; message: string }[];
};

export const stellicExportResult = writable<StellicExportResult | null>(null);

/** A Junction course whose sections overlap a course already in Stellic. */
export type StellicConflict = {
    id: string;
    junctionCode: string;
    existingCode: string;
    when: string;
};

/**
 * The conflict the StellicConflict modal is asking about. `answer` is called
 * once: true = use the Junction schedule, false = keep Stellic's course,
 * null = the student closed the popup (cancel the export).
 */
export const stellicConflictPrompt = writable<{
    conflict: StellicConflict;
    index: number;
    total: number;
    answer: (useJunction: boolean | null) => void;
} | null>(null);
