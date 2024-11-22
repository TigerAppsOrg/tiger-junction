import { and, eq } from "drizzle-orm";
import { db } from "../../db/db";
import * as schema from "../../db/schema";
import { fetchRegSeats } from "../shared/reg-fetchers";

// Update all seats for a given term
export const updateSeats = async (term: number) => {
    const BATCH_SIZE = 30;

    const startTime = Date.now();

    const courses = await db
        .select({
            id: schema.courses.id,
            listingId: schema.courses.listingId
        })
        .from(schema.courses)
        .where(eq(schema.courses.term, term));

    for (let i = 0; i < courses.length; i += BATCH_SIZE) {
        const batch = courses.slice(i, i + BATCH_SIZE).map(x => x.listingId);
        const seatData = await fetchRegSeats(batch, term);

        for (const seat of seatData) {
            const course = courses.find(x => x.listingId === seat.listingId);
            if (!course) {
                throw new Error(
                    "Something went horribly wrong with the seat fetcher"
                );
            }

            // Perhaps this could be a lot faster
            for (const section of seat.sections) {
                await db
                    .update(schema.sections)
                    .set({
                        cap: section.cap,
                        tot: section.tot,
                        status: section.status
                    })
                    .where(
                        and(
                            eq(schema.sections.num, section.num),
                            eq(schema.sections.courseId, course.id)
                        )
                    );
            }
        }
        // TODO -- perform Redis transfer
    }

    console.log(`Finished seat update in ${(Date.now() - startTime) / 1000}s`);
};

// Update all seats for a given term indefinitely
export const updateSeatsForever = async (term: number) => {
    const BREAK_TIME = 5000;

    const gracefulShutdown = () => {
        console.log("\nExiting seat update loop");
        // TODO -- perform Redis transfer
        process.exit();
    };

    process.on("SIGINT", gracefulShutdown);
    process.on("SIGTERM", gracefulShutdown);

    while (true) {
        await updateSeats(term);
        await new Promise(resolve => setTimeout(resolve, BREAK_TIME));
    }
};

const isMainModule = process.argv[1] === import.meta.url.slice(7);
if (isMainModule) {
    console.log("Updating seats for term 1254");
    updateSeatsForever(1254);
}
