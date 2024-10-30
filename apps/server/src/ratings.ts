import { supabase, TERMS } from "./shared";
import { JSDOM } from "jsdom";

type IdPair = {
    listingId: string;
    supabaseId: number;
};

async function getCoursesFromSupabase(term: number): Promise<IdPair[]> {
    const { data, error } = await supabase
        .from("courses")
        .select("id, listing_id")
        .eq("term", term);

    if (error) throw new Error("Error fetching courses from Supabase");
    return data.map(course => {
        return {
            listingId: course.listing_id,
            supabaseId: course.id
        };
    }) as IdPair[];
}

// Return the most recent rating for a course, or null if none found
async function scrapeRatingsForCourse(
    listingId: string,
    term: number
): Promise<number | null> {
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
        const rating = parseRating(text);
        if (rating !== null) return rating;
    }

    return null;
}

// Analyze the webpage and return the rating, or null if none found
function parseRating(pageText: string): number | null {
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
        if (evalMap.has(category)) return evalMap.get(category)!;
    }

    return null;
}

// Update the ratings for a single course
async function handleCourse(idPair: IdPair, term: number) {
    const rating = await scrapeRatingsForCourse(idPair.listingId, term);

    console.log("Updating course", idPair.listingId, "with rating", rating);

    // Update course in Supabase
    // const { error } = await supabase
    //     .from("courses")
    //     .update({ rating: rating })
    //     .eq("id", idPair.supabaseId);

    // if (error) {
    //     console.error("Error updating course", idPair.listingId);
    // }
}

/**
 * Refresh ratings for all courses in a given term
 * @param term
 */
async function updateRatings(term: number) {
    // Immediately throw error if REG_COOKIE is not set
    if (!process.env.REG_COOKIE) {
        throw new Error("No REG_COOKIE found in environment");
    }

    console.log("Updating ratings for term", term);
    const startTime = Date.now();
    const courses = await getCoursesFromSupabase(term);

    for (const course of courses) {
        await handleCourse(course, term);
    }

    // Return timestamp
    const endTime = Date.now();
    console.log("Updated ratings in ", (endTime - startTime) / 1000, "s");
}

// Main script execution
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

updateRatings(term);
