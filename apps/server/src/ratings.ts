async function getCoursesFromSupabase() {}

async function scrapeRatingsForCourse() {}

function processRatingsForCourse() {}

// Update the ratings for a single course
async function handleCourse() {
    await scrapeRatingsForCourse();
    processRatingsForCourse();

    // Update course in Supabase
}

/**
 * Refresh ratings for all courses in a given term
 * @param term
 */
export async function updateRatings(term: number) {
    console.log("Updating ratings for term", term);
    const startTime = Date.now();
    const courses: any[] = getCoursesFromSupabase();

    for (const course of courses) {
        await handleCourse();
    }

    // Return timestamp
    const endTime = Date.now();
    console.log("Updated ratings in ", (endTime - startTime) / 1000, "s");
}
