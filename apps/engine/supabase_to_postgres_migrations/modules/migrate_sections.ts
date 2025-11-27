/*
 * Migrate sections from Supabase to PostgreSQL
 * Maps sections to their corresponding courses
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sections as sectionsTable, courses as coursesTable } from '../../src/db/schema.ts';
import { eq } from 'drizzle-orm';

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

console.log('Populating sections table...\n');

interface SupabaseSection {
    id: number;
    course_id: number;
    num: number;
    room: string | null;
    tot: number | null;
    cap: number | null;
    start_time: number | null;
    end_time: number | null;
    days: number | null;
    title: string;
    category: string;
    status: number | null;
    term: number | null;
}

// Fetch all sections from Supabase with pagination
async function fetchSections(): Promise<SupabaseSection[]> {
    console.log('Fetching sections from Supabase...');

    let allSections: SupabaseSection[] = [];
    let from = 0;
    const batchSize = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('sections')
            .select('id, course_id, num, room, tot, cap, start_time, end_time, days, title, category, status, term')
            .range(from, from + batchSize - 1)
            .order('id', { ascending: true });

        if (error) throw new Error(`Failed to fetch sections: ${error.message}`);
        if (!data || data.length === 0) break;

        allSections = allSections.concat(data);
        console.log(`  Fetched ${allSections.length} sections so far...`);

        if (data.length < batchSize) break;
        from += batchSize;
    }

    console.log(`✅ Fetched ${allSections.length} total sections\n`);
    return allSections;
}

// Get PostgreSQL course ID from Supabase course ID
async function getPostgresCourseId(supabaseCourseId: number, term: number): Promise<string | null> {
    // In Supabase, course_id is just the integer ID
    // In PostgreSQL, we need to find the course by its composite ID (listing_id-term)
    // We need to query Supabase to get the listing_id for this course_id
    const { data, error } = await supabase
        .from('courses')
        .select('listing_id')
        .eq('id', supabaseCourseId)
        .single();

    if (error || !data) return null;

    // Create the composite ID
    return `${data.listing_id}-${term}`;
}

// Convert status number to enum
function convertStatus(status: number | null): 'open' | 'closed' | 'canceled' {
    if (status === null) return 'open';
    switch (status) {
        case 0: return 'open';
        case 1: return 'closed';
        case 2: return 'canceled';
        default: return 'open';
    }
}

// Main migration
export async function migrateSections() {
    try {
        const sections = await fetchSections();
        const stats = { inserted: 0, skipped: 0, errors: 0 };

        for (const section of sections) {
            try {
                // Skip sections with null term - they can't be matched to courses
                if (!section.term) {
                    stats.skipped++;
                    continue;
                }

                // Get the PostgreSQL course ID
                const postgresCourseId = await getPostgresCourseId(section.course_id, section.term);

                if (!postgresCourseId) {
                    console.log(`⏭️  Section ${section.id}: Course ${section.course_id} not found in PostgreSQL`);
                    stats.skipped++;
                    continue;
                }

                await db.insert(sectionsTable).values({
                    courseId: postgresCourseId,
                    title: section.title,
                    num: section.num.toString(),
                    room: section.room,
                    tot: section.tot || 0,
                    cap: section.cap || 0,
                    days: section.days || 0,
                    startTime: section.start_time || 0,
                    endTime: section.end_time || 0,
                    status: convertStatus(section.status)
                });

                stats.inserted++;
            } catch (err: any) {
                // Check if it's a duplicate key error
                if (err.code === '23505' || err.cause?.code === '23505') {
                    stats.skipped++;
                } else {
                    console.error(`❌ Section ${section.id}:`);
                    console.error(`   Error code: ${err.code || err.cause?.code}`);
                    console.error(`   Error message: ${err.message}`);
                    if (err.cause) {
                        console.error(`   Underlying error: ${err.cause.message}`);
                    }
                    console.error(`   Full section data:`, JSON.stringify(section, null, 2));
                    stats.errors++;
                }
            }
        }

        console.log('\n=== Completed Sections Migration ===');
        console.log(`✅ Inserted: ${stats.inserted} | ⏭️  Skipped: ${stats.skipped} | ❌ Errors: ${stats.errors}`);

        return stats;
    } catch (err) {
        console.error('Sections migration failed:', err);
        process.exit(1);
    }
}
