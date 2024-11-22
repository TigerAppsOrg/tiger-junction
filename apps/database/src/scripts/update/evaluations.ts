import { eq, isNull } from "drizzle-orm";
import { db } from "../../db/db";
import * as schema from "../../db/schema";
import { Status } from "../shared/db-types";
import { daysToValue, formatCourseStatus, timeToValue } from "../shared/format";
import {
    fetchRegCourseDetails,
    fetchRegDepartments,
    fetchRegDeptCourses
} from "../shared/reg-fetchers";
import type { RegCourseDetails, RegDeptCourse } from "../shared/reg-types";
import { JSDOM } from "jsdom";

export const TERMS = [
    1254, 1252, 1244, 1242, 1234, 1232, 1224, 1222, 1214, 1212, 1204, 1202,
    1194, 1192
];

type IdPair = {
    listingId: string;
    dbId: number;
};

type RatingPair = {
    rating: number;
    ratingSource: string;
}

async function getCoursesFromDB(term: number): Promise<IdPair[]> {
    const data = await db
        .select({ 
            id: schema.courses.id, 
            listing_id: schema.courses.listingId 
        })
        .from(schema.courses)
        .where(eq(schema.courses.term, term));
    // TODO better error handling?
    return data.map(course => {
        return {
            listingId: course.listing_id,
            dbId: course.id
        };
    }) as IdPair[];
}


//----------------------------------------------------------------------

// Return the most recent rating for a course, or null if none found
async function scrapeEvalsForCourse(
    listingId: string,
    term: number
) {
    // There is no API for course ratings, so we need to scrape the page
    // REG_COOKIE must be set manually by whoever wants to run this script

    const formatRatingsURL = (term: number) => {
        const RATINGS_URL =
            "https://registrarapps.princeton.edu/course-evaluation?";
        return `${RATINGS_URL}terminfo=${term}&courseinfo=${listingId}`;
    };

    const currentTermIndex = TERMS.indexOf(term);
    if (currentTermIndex === -1) {
        throw new Error("Invalid term number");
    }
    const activeTerms = TERMS.slice(currentTermIndex);

    for (const term of activeTerms) {
        const url = formatRatingsURL(term);
        const res = await fetch(url, {
            headers: {
                cookie: "PHPSESSID=" + process.env.REG_COOKIE!
            }
        });
        const text = await res.text();
        const evals = parseEvals(text);
        const ratingPair = parseRating(text);
        if (ratingPair !== null && evals !== null) return { ...ratingPair, ...evals };
    }

    return null;
}

//----------------------------------------------------------------------

// Analyze the webpage and return the rating, or null if none found
function parseRating(pageText: string): RatingPair | null {
    const NULL_STRING = "the class you selected are not available online";
    if (pageText.includes(NULL_STRING)) return null;

    const dom = new JSDOM(pageText);

    const evalLabels = dom.window.document
        .querySelectorAll("tr")[0]
        .querySelectorAll("th");
    const evalRatings = dom.window.document
        .querySelectorAll("tr")[1]
        .querySelectorAll("td");

    const evalMap = new Map<string, number>();
    for (let i = 0; i < evalLabels.length; i++) {
        const label = evalLabels[i].textContent;
        const rating = evalRatings[i].textContent;
        if (rating === null || label === null) continue;
        evalMap.set(label, parseFloat(rating));
    }

    // Find the first category that has a rating
    const CATEGORIES = [
        "Quality of Course", // General
        "Overall Quality of the Course", // Some grad courses
        "Overall Course Quality Rating", // FRS
        "Quality of the Seminar", // Seminar Edge Case
        "Quality of Lectures", // Lecture Edge Case
        "Quality of Precepts", // Precept Edge Case
        "Quality of Laboratories", // Lab Edge Case
        "Recommend to Other Students", // Edge Case
        "Quality of Readings", // Fallback
        "Quality of Written Assignments" // Fallback
    ];

    for (const category of CATEGORIES) {
        if (evalMap.has(category)) return {
            rating: evalMap.get(category)!,
            ratingSource: category
        };
    }

    return null;
}

//----------------------------------------------------------------------

// Analyze the webpage and return the evaluation text + number of evals, or null if none found
function parseEvals(pageText: string) {
    const NULL_STRING = "the class you selected are not available online";
    if (pageText.includes(NULL_STRING)) return null;

    const dom = new JSDOM(pageText);
    const comments = dom.window.document.querySelectorAll(".comment");
    const text = ([...comments].map(x => x.textContent)).filter(x => x !== null);

    return {numComments: text.length || null, comments: text || null}
}

//----------------------------------------------------------------------

// Update the ratings/evaluations for a single course
async function handleCourse(idPair: IdPair, term: number) {
    // find the most recent rating (ex: 3.5, Course Quality) and evaluations
    const data = await scrapeEvalsForCourse(idPair.listingId, term);

    if (data === null) {
        return;
    }

    // TODO: metadata?
    const inserts = { ...data, courseId: idPair.dbId, summary: null, metadata: null };

    // Insert evaluation and related data to database
    await db.transaction(async tx => {
        // Upsert course and get id
        const courseRes = await tx
            .insert(schema.evaluations)
            .values(inserts)
            // .onConflictDoUpdate({
            //     target: [schema.evaluations.courseId],
            //     set: {
            //         numComments: inserts.numComments,
            //         comments: inserts.comments,
            //         summary: inserts.summary,
            //         rating: inserts.rating,
            //         ratingSource: inserts.ratingSource,
            //         metadata: inserts.metadata
            //     }
            // })
            .returning({
                id: schema.evaluations.id
            });

        if (courseRes.length !== 1) {
            throw new Error("Course upsert failed");
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
    const courses = (await getCoursesFromDB(term)).slice(startIndex);

    const PARALLEL_PROMISES = 5;
    const SLEEP_TIME_MS = 1000;

    for (let i = 0; i < courses.length; i += PARALLEL_PROMISES) {
        const progStr = "Progress: " + i + "/" + courses.length;
        const timeProgS = Math.round((Date.now() - startTime) / 1000);
        const timeProgStr = "(" + timeProgS + "s elapsed)";
        console.log(progStr, timeProgStr);

        const batch = courses.slice(i, i + PARALLEL_PROMISES);
        await Promise.all(batch.map(course => handleCourse(course, term)));

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
    if (args.length === 0) {
        console.error("Please provide a term number");
        process.exit(1);
    }

    const term = parseInt(args[0]);
    if (!TERMS.includes(term)) {
        console.error("Invalid term number");
        process.exit(1);
    }

    const startIndex = args.length > 1 ? parseInt(args[1]) : 0;

    await updateRatings(term, startIndex);
    // redis transfer?
}

const isMainModule = process.argv[1] === import.meta.url.slice(7);
if (isMainModule) {
    main();
}