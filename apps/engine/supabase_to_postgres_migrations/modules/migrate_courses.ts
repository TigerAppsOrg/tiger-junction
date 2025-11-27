/*
 * Migrate courses from Supabase to PostgreSQL
 * Populates the courses table in PostgreSQL
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { courses as coursesTable } from '../../src/db/schema.ts';

// Setup
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const { PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, POSTGRES_URL } = process.env;

if (!PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !POSTGRES_URL) {
    console.error('Missing environment variables: PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or POSTGRES_URL');
    process.exit(1);
}

const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});
const db = drizzle(POSTGRES_URL);

console.log('Populating courses table...\n');

interface SupabaseCourse {
    id: number;
    listing_id: string;
    term: number;
    code: string;
    title: string;
    basis: string;
    dists: string | string[]; // Can be either string or array in Supabase
    rating: number | null;
    status: number;
    num_evals: number | null;
    instructors: string | null;
    has_final: boolean | null;
    emplids: string | null;
}

// Fetch all courses from Supabase
async function fetchCourses(): Promise<SupabaseCourse[]> {
    console.log('Fetching courses from Supabase...');

    let allCourses: SupabaseCourse[] = [];
    let from = 0;
    const batchSize = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('courses')
            .select('id, listing_id, term, code, title, basis, dists, rating, status, num_evals, instructors, has_final, emplids')
            .range(from, from + batchSize - 1)
            .order('id', { ascending: true });

        if (error) throw new Error(`Failed to fetch courses: ${error.message}`);
        if (!data || data.length === 0) break;

        allCourses = allCourses.concat(data);
        console.log(`  Fetched ${allCourses.length} courses so far...`);

        if (data.length < batchSize) break;
        from += batchSize;
    }

    console.log(`✅ Fetched ${allCourses.length} total courses\n`);
    return allCourses;
}

// Convert status number to enum
function convertStatus(status: number): 'open' | 'closed' | 'canceled' {
    switch (status) {
        case 0: return 'open';
        case 1: return 'closed';
        case 2: return 'canceled';
        default: return 'open';
    }
}

// Main migration
export async function migrateCourses() {
    try {
        const courses = await fetchCourses();
        const stats = { inserted: 0, skipped: 0, errors: 0 };

        for (const course of courses) {
            try {
                // Parse dists - handle both string and array types
                let distsArray: string[] = [];
                if (course.dists) {
                    if (typeof course.dists === 'string') {
                        distsArray = course.dists.split(',').map(d => d.trim());
                    } else if (Array.isArray(course.dists)) {
                        distsArray = course.dists;
                    }
                }

                // Create composite ID: listing_id-term
                const compositeId = `${course.listing_id}-${course.term}`;

                await db.insert(coursesTable).values({
                    id: compositeId,
                    listingId: course.listing_id,
                    term: course.term,
                    code: course.code,
                    title: course.title,
                    description: '', // Supabase doesn't have description, use empty string
                    status: convertStatus(course.status),
                    dists: distsArray,
                    gradingBasis: course.basis || 'OTH', // Default to 'OTH' if null/empty
                    hasFinal: course.has_final
                });

                stats.inserted++;
            } catch (err: any) {

                console.error(`❌ Course ${course.listing_id} (${course.term}):`);
                console.error(`   Error code: ${err.code || err.cause?.code}`);
                console.error(`   Error message: ${err.message}`);
                if (err.cause) {
                    console.error(`   Underlying error: ${err.cause.message}`);
                    console.error(`   Underlying code: ${err.cause.code}`);
                }
                console.error(`   Constraint: ${err.constraint || err.cause?.constraint || 'N/A'}`);
                console.error(`   Full course data:`, JSON.stringify(course, null, 2));
                stats.errors++;
            }
        }

        console.log('\n=== Completed Courses Migration ===');
        console.log(`✅ Inserted: ${stats.inserted} | ⏭️  Skipped: ${stats.skipped} | ❌ Errors: ${stats.errors}`);

        return stats;
    } catch (err) {
        console.error('Courses migration failed:', err);
        process.exit(1);
    }
}
