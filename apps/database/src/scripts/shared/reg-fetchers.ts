/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file scripts/reg-fetchers.ts
 * @description Functions for fetching course listings and details from
 * the registrar API.
 * @author Joshua Lau
 */

import { Status } from "./db-types";
import type {
    RegCourseDetails,
    RegDeptCourse,
    RegListing,
    RegSeat
} from "./reg-types";

//----------------------------------------------------------------------
// Helpers and Constants
//----------------------------------------------------------------------

// API endpoint for the registrar student-app API
const REG_API_URL = "https://api.princeton.edu/student-app/1.0.3/";

// One update run resolves listings several times — memoize per term.
const listingsCache = new Map<number, RegListing[]>();
// The details endpoint 500s under load (~6% of calls at concurrency 20);
// keep concurrency low and retry with backoff.
const DETAIL_CONCURRENCY = 5;
const DETAIL_RETRIES = 3;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Authentication history: we used to scrape a token from the registrar website
// (Cloudflare now 403s that from everywhere), then a static API_ACCESS_TOKEN
// (WSO2 token that OIT rotates without notice — it went stale 2026-09-01 and
// broke the hourly course update). The durable path is minting our own OAuth
// client_credentials token from CONSUMER_KEY / CONSUMER_SECRET, refreshed
// automatically on 401. API_ACCESS_TOKEN remains a fallback when no consumer
// credentials are configured.
//
// The old listings source (registrar/course-offerings/classes/<term>) sits
// behind an API product our credentials are not subscribed to, so
// fetchRegListings now builds the same shape from the student-app API.

const TOKEN_URL = "https://api.princeton.edu/token";

let cachedAuthHeader: string | null = null;

const mintAuthHeader = async (): Promise<string | null> => {
    const key = process.env.CONSUMER_KEY;
    const secret = process.env.CONSUMER_SECRET;
    if (!key || !secret) return null;
    const res = await fetch(TOKEN_URL, {
        method: "POST",
        headers: {
            Authorization:
                "Basic " + Buffer.from(`${key}:${secret}`).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials"
    });
    if (!res.ok) {
        throw new Error(`OAuth token endpoint responded ${res.status}`);
    }
    const payload: any = await res.json();
    return "Bearer " + payload.access_token;
};

const getAuthHeader = async (): Promise<string> => {
    if (cachedAuthHeader) return cachedAuthHeader;
    cachedAuthHeader =
        (await mintAuthHeader()) ?? process.env.API_ACCESS_TOKEN ?? null;
    if (!cachedAuthHeader) {
        throw new Error(
            "Set CONSUMER_KEY + CONSUMER_SECRET (preferred) or API_ACCESS_TOKEN"
        );
    }
    return cachedAuthHeader;
};

const regFetchJson = async (url: string): Promise<any> => {
    let res = await fetch(url, {
        headers: { Authorization: await getAuthHeader() }
    });
    if (
        res.status === 401 &&
        process.env.CONSUMER_KEY &&
        process.env.CONSUMER_SECRET
    ) {
        // Token expired mid-run — re-mint once and retry.
        cachedAuthHeader = await mintAuthHeader();
        res = await fetch(url, {
            headers: { Authorization: cachedAuthHeader as string }
        });
    }
    if (!res.ok) {
        throw new Error(`Registrar API responded ${res.status} for ${url}`);
    }
    return res.json();
};

//----------------------------------------------------------------------
// Fetcher Functions
//----------------------------------------------------------------------

/**
 * Fetch all course listings for a given term
 * @param term Term code
 */
export const fetchRegListings = async (term: number): Promise<RegListing[]> => {
    const cached = listingsCache.get(term);
    if (cached) return cached;

    const subjects = await fetchRegDepartments(term);
    if (subjects.length === 0) {
        throw new Error("No subjects returned for term " + term);
    }

    // Crosslisted courses appear under every subject — dedupe by course_id.
    const feedById = new Map<
        string,
        { subject: string; catnum: string; title: string }
    >();
    for (const subject of subjects) {
        const courses = await fetchRegDeptCourses(subject, term);
        for (const course of courses) {
            if (feedById.has(course.course_id)) continue;
            feedById.set(course.course_id, {
                subject,
                catnum: course.catalog_number,
                title: course.title
            });
        }
    }

    const courseIds = Array.from(feedById.keys());
    const listings: RegListing[] = [];
    let detailFailureCount = 0;
    for (let i = 0; i < courseIds.length; i += DETAIL_CONCURRENCY) {
        const batch = courseIds.slice(i, i + DETAIL_CONCURRENCY);
        const detailBatch = await Promise.all(
            batch.map(async id => {
                for (let attempt = 1; attempt <= DETAIL_RETRIES; attempt++) {
                    try {
                        return { id, details: await fetchRegCourseDetails(id, term) };
                    } catch (error) {
                        if (attempt === DETAIL_RETRIES) {
                            console.error(
                                `Details fetch failed for ${id}: ${(error as Error).message}`
                            );
                        } else {
                            await sleep(1000 * attempt);
                        }
                    }
                }
                return { id, details: null };
            })
        );
        for (const { id, details } of detailBatch) {
            if (details === null) detailFailureCount++;
            const feed = feedById.get(id)!;
            const crosslistings =
                details?.crosslistings || `${feed.subject} ${feed.catnum}`;
            // The subject/catnum of the primary listing lead the crosslistings
            // string (e.g. "COS 217/ECE 217").
            const primary = crosslistings.split("/")[0].trim().split(/\s+/);
            listings.push({
                course_id: id,
                subject: primary[0] || feed.subject,
                catnum: primary.slice(1).join(" ") || feed.catnum,
                long_title: details?.long_title || feed.title,
                topic_title: details?.topic_title || null,
                crosslistings,
                distribution_area: details?.distribution_area_short || null
            });
        }
    }

    // A degraded run must fail loudly rather than silently wipe
    // details-derived data (dists, crosslisting codes) downstream.
    if (detailFailureCount > courseIds.length * 0.05) {
        throw new Error(
            `Registrar details failed for ${detailFailureCount}/${courseIds.length} courses — aborting listings build`
        );
    }
    listingsCache.set(term, listings);
    return listings;
};

export const fetchRegDepartments = async (term: number): Promise<string[]> => {
    const data = await regFetchJson(
        `${REG_API_URL}courses/courses?term=${term}&subject=list&fmt=json`
    );
    const subjects = (data?.term?.[0]?.subjects ?? []).map((s: any) => s.code);
    return (subjects as string[]).sort();
};

/**
 * Fetch all courses for a department in a given term
 * @param dept Department code
 * @param term Term code
 */
export const fetchRegDeptCourses = async (
    dept: string,
    term: number
): Promise<RegDeptCourse[]> => {
    const deptData: any = await regFetchJson(
        `${REG_API_URL}courses/courses?term=${term}&subject=${dept}&fmt=json`
    );
    if (!deptData.term[0].subjects) {
        console.error("No courses found for department " + dept);
        return [];
    }

    // Find correct department
    const correctIndex = deptData.term[0].subjects.findIndex(
        (x: any) => x.code === dept
    );

    if (correctIndex === -1) {
        console.error("No courses found for department " + dept);
        return [];
    }

    return deptData.term[0].subjects[correctIndex].courses as RegDeptCourse[];
};

/**
 * Fetch course details for a given course in a given term
 * @param listingId Listing ID
 * @param term Term code
 */
export const fetchRegCourseDetails = async (
    listingId: string,
    term: number
): Promise<RegCourseDetails> => {
    const courseDetails: any = await regFetchJson(
        `${REG_API_URL}courses/details?term=${term}&course_id=${listingId}&fmt=json`
    );

    const valid =
        courseDetails &&
        courseDetails.course_details &&
        courseDetails.course_details.course_detail;
    if (!valid) throw new Error("Invalid course details response format");

    return courseDetails.course_details.course_detail as RegCourseDetails;
};

/**
 * Fetch seat data for a list of courses in a given term
 * @param courseIds
 * @param term
 */
export const fetchRegSeats = async (
    courseIds: string[],
    term: number
): Promise<RegSeat[]> => {
    const seatData: any = await regFetchJson(
        `${REG_API_URL}courses/seats?term=${term}&course_ids=${courseIds.join(
            ","
        )}&fmt=json`
    );

    const valid = seatData.course && Array.isArray(seatData.course);
    if (!valid) throw new Error("Invalid seat data response format");

    const formattedSeatData = seatData.course.map((x: any) => {
        return {
            listingId: x.course_id,
            sections: x.classes.map((y: any) => {
                return {
                    num: y.class_number,
                    tot: parseInt(y.enrollment),
                    cap: parseInt(y.capacity),
                    status: y.pu_calc_status.toLowerCase() as Status
                };
            })
        };
    }) as RegSeat[];

    // Ensure section status is valid
    for (const seat of formattedSeatData) {
        if (
            seat.sections.some(
                x => !["open", "closed", "canceled"].includes(x.status)
            )
        ) {
            console.error("Unknown section status for " + seat.listingId);
        }
    }

    return formattedSeatData;
};
