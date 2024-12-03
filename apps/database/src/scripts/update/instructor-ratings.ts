import { eq, inArray } from "drizzle-orm";
import { db } from "../../db/db";
import * as schema from "../../db/schema";

export const TERMS = [
    1254, 1252, 1244, 1242, 1234, 1232, 1224, 1222, 1214, 1212, 1204, 1202,
    1194, 1192
];

type CourseEval = {
    courseId: number,
    rating: number,
    numComments: number
};

type InstrRating = {
    rating: number,
    numEvals: number,
};

async function getAllInstructors(): Promise<{ emplid: string; }[]> {
    const allIds = await db
        .select({ emplid: schema.instructors.emplid })
        .from(schema.instructors)

    return allIds;
}

async function getEvalsFromDB(emplid: string): Promise<CourseEval[]> {
    // First, find all course IDs for the given instructor
    const instructorCourses = await db
        .select({ courseId: schema.courseInstructorMap.courseId })
        .from(schema.courseInstructorMap)
        .where(eq(schema.courseInstructorMap.instructorId, emplid));

    // Extract course IDs
    const courseIds = instructorCourses.map(course => course.courseId);

    // If no courses found, return an empty array
    if (courseIds.length === 0) {
        return [];
    }

    // Fetch ratings and comments for these courses
    const instructorRatings = await db
        .select({
            courseId: schema.courses.id,
            rating: schema.evaluations.rating,
            numComments: schema.evaluations.numComments
        })
        .from(schema.courses)
        .leftJoin(schema.evaluations, eq(schema.courses.id, schema.evaluations.courseId))
        .where(inArray(schema.courses.id, courseIds));


    // TODO better error handling?
    return instructorRatings as CourseEval[];
}

//----------------------------------------------------------------------

// Get this instructor's course history (across all terms in the db) and 
// calculate their weighted average rating
async function calculateInstructorRating(emplid: string): Promise<InstrRating | null> {
    let weightedAvg = 0;
    let totalComments = 0;

    const instructorRatings = await getEvalsFromDB(emplid);
    instructorRatings.forEach(e => {
        totalComments += e.numComments;
    });
    if (instructorRatings === null) return null;
    
    instructorRatings.forEach(e => {
        weightedAvg += e.rating * (e.numComments / totalComments);
    })
    return { rating: weightedAvg, numEvals: totalComments };
}

//----------------------------------------------------------------------

// Update the ratings/evaluations for a single course
async function handleInstructor(emplid: string) {
    // find the most recent rating (ex: 3.5, Course Quality) and evaluations
    const data = await calculateInstructorRating(emplid);

    if (data === null) {
        return;
    }

    // Insert evaluation and related data to database
    await db.transaction(async tx => {
        // Upsert course and get id
        const instrRes = await tx
            .update(schema.instructors)
            .set(data)
            .where(eq(schema.instructors.emplid, emplid))
            .returning({
                id: schema.instructors.emplid
            });

        if (instrRes.length !== 1) {
            throw new Error("Instructor rating update failed");
        }
    })
}

//----------------------------------------------------------------------

/**
 * Main function. Refresh ratings for all courses in a given term
 * @param term
 */
async function updateRatings(term: number, startIndex: number = 0) {
    // Immediately throw error if REG_COOKIE is not set
    if (!process.env.REG_COOKIE) {
        throw new Error("No REG_COOKIE found in environment");
    }

    console.log("Updating ratings for term", term);
    const startTime = Date.now();
    const instructors = (await getAllInstructors()).slice(startIndex);

    const PARALLEL_PROMISES = 5;
    const SLEEP_TIME_MS = 1000;

    for (let i = 0; i < instructors.length; i += PARALLEL_PROMISES) {
        const progStr = "Progress: " + i + "/" + instructors.length;
        const timeProgS = Math.round((Date.now() - startTime) / 1000);
        const timeProgStr = "(" + timeProgS + "s elapsed)";
        console.log(progStr, timeProgStr);

        const batch = instructors.slice(i, i + PARALLEL_PROMISES);
        await Promise.all(batch.map(instructor => handleInstructor(instructor.emplid)));

        // Sleep to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, SLEEP_TIME_MS));
    }

    // Return timestamp
    const endTime = Date.now();
    console.log("Updated ratings in ", (endTime - startTime) / 1000, "s");
}

//----------------------------------------------------------------------

async function main() {
    const args = process.argv.slice(2);

    const startIndex = args.length > 1 ? parseInt(args[1]) : 0;

    await updateRatings(startIndex);
    // redis transfer?
}

const isMainModule = process.argv[1] === import.meta.url.slice(7);
if (isMainModule) {
    main();
}