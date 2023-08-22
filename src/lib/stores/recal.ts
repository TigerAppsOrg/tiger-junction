import { writable, type Writable } from "svelte/store";

// Current term id
export const currentTerm: Writable<number> = writable(1242);

// Current schedule index
export const currentSchedule: Writable<number> = writable(0);

type SearchSettings = {
    options: Record<string, boolean>,
    filters: Record<string, any>,
}

export const searchSettings: Writable<SearchSettings> = writable({
    "options": {
        "Title": true,
        "Code": true,
        "Instructor": true,
        "All": false,
        // "Smart Search": false,
    }, 
    "filters": {
        "Dists": {
            "enabled": false,
            "values": {
                "CD": true,
                "EC": true,
                "EM": true,
                "HA": true,
                "LA": true,
                "QCR": true,
                "SA": true,
                "SEL": true,
                "SEN": true,
                "No Dist": true,
            }
        },
        "Days": {
            "enabled": false,
            "values": {
                "Monday": true,
                "Tuesday": true,
                "Wednesday": true,
                "Thursday": true,
                "Friday": true,
            }
        },
        "Levels": {
            "enabled": false,
            "values": {
                "100": true,
                "200": true,
                "300": true,
                "400": true,
                "500": true,
                "1000": true,
            }
        },
        "Open Only": {
            "enabled": false,
        }
    }
})