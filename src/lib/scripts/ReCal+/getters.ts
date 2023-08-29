import { currentSchedule, currentTerm } from "$lib/stores/recal";

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