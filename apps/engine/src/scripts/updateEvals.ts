import { I_DB } from "../db/interface";
import { I_OIT_API } from "../oit/interface";

/**
 * Makes the evals data up to date in the database.
 * @param db Database object
 * @param oit OIT API object
 */
export const updateEvals = async (db: I_DB, oit: I_OIT_API) => {
  const mostRecentTerm = await oit.getLatestTermCode();
  if (!mostRecentTerm) throw new Error("Could not fetch most recent term code from OIT API");

  const listingIds = await db.getAllListingIds();
  for (let i = 0; i < listingIds.length; i++) {
    const listingId = listingIds[i];
    // if (i % 50 === 0) {
    console.log(`Updating evals for listing ID ${i + 1} of ${listingIds.length} (${listingId})`);
    // }

    const evals = await oit.getCourseEvals(listingId);
    for (const term of Object.keys(evals)) {
      // TODO: Temporary workaround
      // OIT no longer has data for earlier than this, we need to get from PrincetonCourses
      if (parseInt(term) < 1234) continue;
      console.log(`Updating evals for listing ID ${listingId} for term ${term}...`);
      const termEvals = evals[term];
      for (const evalData of termEvals) {
        const courseId = `${listingId}-${term}`;
        await db.upsertEval(courseId, evalData);
      }
    }
  }
};
