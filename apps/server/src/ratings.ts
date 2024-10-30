import { supabase, TERMS } from "./shared";

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

async function scrapeRatingsForCourse(listingId: string) {
    // There is no API for course ratings, so we need to scrape the page
    // REG_COOKIE must be set manually by whoever wants to run this script

    const formatRatingsURL = (term: number) => {
        const RATINGS_URL =
            "https://registrarapps.princeton.edu/course-evaluation?";
        return `${RATINGS_URL}terminfo=${term}&courseinfo=${listingId}`;
    };

    for (const term of TERMS) {
        const url = formatRatingsURL(term);
        const res = await fetch(url, {
            headers: {
                cookie: "PHPSESSID=" + process.env.REG_COOKIE!
            }
        });
        const text = await res.text();
        console.log(text);
    }
}

function processRatingsForCourse(): number {}

// Update the ratings for a single course
async function handleCourse(idPair: IdPair) {
    await scrapeRatingsForCourse(idPair.listingId);
    processRatingsForCourse();

    // Update course in Supabase
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
        await handleCourse(course);
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
