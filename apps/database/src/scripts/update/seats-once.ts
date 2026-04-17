import { supabase, TERMS } from "../supabase/shared";
import { fetchRegSeats } from "../shared/reg-fetchers";
import { redisTransfer } from "../supabase/redis";

const termArg = process.argv[2];
if (!termArg) {
    throw new Error("Usage: bun src/scripts/update/seats-once.ts <term>");
}

const term = parseInt(termArg, 10);
if (Number.isNaN(term) || !TERMS.includes(term)) {
    throw new Error(`Invalid term: ${termArg}`);
}

const BATCH_SIZE = 30;
const startTime = Date.now();

console.log(`One-shot seat update for term ${term}`);

const { data: courses, error: courseErr } = await supabase
    .from("courses")
    .select("id, listing_id")
    .eq("term", term);

if (courseErr) throw new Error(courseErr.message);
if (!courses || courses.length === 0) {
    throw new Error(`No courses found for term ${term}`);
}

console.log(`Fetched ${courses.length} courses`);

let updateCount = 0;
let errorCount = 0;

for (let i = 0; i < courses.length; i += BATCH_SIZE) {
    const batch = courses.slice(i, i + BATCH_SIZE);
    const listingIds = batch.map(c => c.listing_id);

    const seatData = await fetchRegSeats(listingIds, term);

    for (const seat of seatData) {
        const course = batch.find(c => c.listing_id === seat.listingId);
        if (!course) continue;

        for (const section of seat.sections) {
            const { error: updateErr } = await supabase
                .from("sections")
                .update({
                    cap: section.cap,
                    tot: section.tot,
                    status: section.status
                })
                .eq("num", section.num)
                .eq("course_id", course.id);

            if (updateErr) {
                errorCount++;
                console.error(
                    `Section ${section.num} / course ${course.listing_id}: ${updateErr.message}`
                );
                continue;
            }
            updateCount++;
        }
    }
}

console.log(
    `Section updates: ${updateCount} ok, ${errorCount} failed in ${(Date.now() - startTime) / 1000}s`
);

await redisTransfer(term);

process.exit(0);
