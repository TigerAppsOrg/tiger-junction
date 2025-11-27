/*
 * Migrate schedules from Supabase to PostgreSQL
 * Calculates relative_id for each schedule based on user_id and term
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { schedules as schedulesTable, users as usersTable } from '../../src/db/schema.ts';
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

console.log('Populating schedules table...\n');

interface SupabaseSchedule {
    id: number;
    user_id: string;
    title: string;
    term: number;
    is_public: boolean;
}

// Fetch all schedules from Supabase with pagination
async function fetchSchedules(): Promise<SupabaseSchedule[]> {
    console.log('Fetching schedules from Supabase...');

    let allSchedules: SupabaseSchedule[] = [];
    let from = 0;
    const batchSize = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('schedules')
            .select('id, user_id, title, term, is_public')
            .range(from, from + batchSize - 1)
            .order('id', { ascending: true });

        if (error) throw new Error(`Failed to fetch schedules: ${error.message}`);
        if (!data || data.length === 0) break;

        allSchedules = allSchedules.concat(data);
        console.log(`  Fetched ${allSchedules.length} schedules so far...`);

        if (data.length < batchSize) break;
        from += batchSize;
    }

    console.log(`✅ Fetched ${allSchedules.length} total schedules\n`);
    return allSchedules;
}

// Get PostgreSQL user ID from Supabase user ID
async function getPostgresUserId(supabaseUserId: string): Promise<number | null> {
    const result = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.supabase_id, supabaseUserId))
        .limit(1);

    return result.length > 0 ? result[0].id : null;
}

// Calculate relative_id for schedules
// Groups by user_id and term, then assigns 1, 2, 3... based on original schedule ID order
function calculateRelativeIds(schedules: SupabaseSchedule[]): Map<number, number> {
    const relativeIdMap = new Map<number, number>();

    // Group schedules by user_id and term
    const groupedSchedules = new Map<string, SupabaseSchedule[]>();

    for (const schedule of schedules) {
        const key = `${schedule.user_id}_${schedule.term}`;
        if (!groupedSchedules.has(key)) {
            groupedSchedules.set(key, []);
        }
        groupedSchedules.get(key)!.push(schedule);
    }

    // For each group, sort by id and assign relative_id 1, 2, 3...
    for (const [_, groupSchedules] of groupedSchedules) {
        groupSchedules.sort((a, b) => a.id - b.id);
        groupSchedules.forEach((schedule, index) => {
            relativeIdMap.set(schedule.id, index + 1);
        });
    }

    return relativeIdMap;
}

// Main migration
export async function migrateSchedules() {
    try {
        const schedules = await fetchSchedules();
        const relativeIdMap = calculateRelativeIds(schedules);

        const stats = { inserted: 0, skipped: 0, errors: 0 };

        for (const schedule of schedules) {
            try {
                // Get the PostgreSQL user ID
                const postgresUserId = await getPostgresUserId(schedule.user_id);

                if (!postgresUserId) {
                    stats.skipped++;
                    continue;
                }

                const relativeId = relativeIdMap.get(schedule.id);
                if (!relativeId) {
                    console.error(`❌ Schedule ${schedule.id}: Could not calculate relative_id`);
                    stats.errors++;
                    continue;
                }

                await db.insert(schedulesTable).values({
                    relativeId: relativeId,
                    userId: postgresUserId,
                    title: schedule.title,
                    isPublic: schedule.is_public,
                    term: schedule.term
                });

                stats.inserted++;
            } catch (err) {
                console.error(`❌ Schedule ${schedule.id}: ${err}`);
                stats.errors++;
            }
        }

        console.log('\n=== Completed Schedules Migration ===');
        console.log(`✅ Inserted: ${stats.inserted} | ⏭️  Skipped: ${stats.skipped} | ❌ Errors: ${stats.errors}`);

        return stats;
    } catch (err) {
        console.error('Schedules migration failed:', err);
        process.exit(1);
    }
}
