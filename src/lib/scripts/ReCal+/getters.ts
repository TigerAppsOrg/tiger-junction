import { currentSchedule } from "$lib/stores/recal";
import { currentTerm } from "$lib/changeme";

// Get the current schedule
const getCurrentSchedule = (): number => {
    let schedule: number = -1;
    currentSchedule.subscribe(x => {
        schedule = x;
    })();
    return schedule;
}

// Get the current term
const getCurrentTerm = (): number => {
    let term: number = -1;
    currentTerm.subscribe(x => {
        term = x;
    })();
    return term;
}

export { getCurrentSchedule, getCurrentTerm }