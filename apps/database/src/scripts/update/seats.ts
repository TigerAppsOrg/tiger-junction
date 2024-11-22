import { db } from "../../db/db";

// Update all seats for a given term
export const updateSeats = async (term: number) => {};

const isMainModule = process.argv[1] === import.meta.url.slice(7);
if (isMainModule) {
    updateSeats(1254);
}
