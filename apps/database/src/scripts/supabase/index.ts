// Usage: bun run update-data <term> (--grading -g)

import { populateListings } from "./listings";
import { populateCourses } from "./courses";
import { redisTransfer } from "./redis";
import { TERMS } from "./shared";

const args = process.argv.slice(2);

if (args.length === 0) {
    console.error("Please provide a term number");
    process.exit(1);
}

const term = parseInt(args[0]);
if (!TERMS.includes(term)) {
    console.error("Invalid term number");
    process.exit(1);
}

const flags = args.slice(1);
const updateGrading = flags.includes("--grading") || flags.includes("-g");

(async () => {
    const startTime = Date.now();
    console.log("Starting data update for term", term);
    await populateListings(term);
    await populateCourses(term, updateGrading);
    await redisTransfer(term);
    const endTime = Date.now();
    console.log("Finished in", (endTime - startTime) / 1000, "s");
})();
