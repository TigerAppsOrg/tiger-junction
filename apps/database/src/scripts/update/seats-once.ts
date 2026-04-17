import { updateSeats } from "./seats";
import { redisTransfer } from "../supabase/redis";
import { TERMS } from "../supabase/shared";

const termArg = process.argv[2];
if (!termArg) {
    throw new Error("Usage: bun src/scripts/update/seats-once.ts <term>");
}

const term = parseInt(termArg, 10);
if (Number.isNaN(term) || !TERMS.includes(term)) {
    throw new Error(`Invalid term: ${termArg}`);
}

console.log(`One-shot seat update for term ${term}`);
await updateSeats(term);
await redisTransfer(term);
console.log("Redis sync complete");
process.exit(0);
