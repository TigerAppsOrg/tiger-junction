/*
 * Migrate users from Supabase to PostgreSQL
 * Populates the user table in PostgreSQL 
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { users as usersTable } from '../../src/db/schema.ts';
import { eq } from 'drizzle-orm';
import { readFileSync } from 'fs';

// Setup
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '.env') });

const { PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, POSTGRES_URL } = process.env;

if (!PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !POSTGRES_URL) {
    console.error('Missing environment variables: PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or POSTGRES_URL');
    process.exit(1);
}

const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});
const db = drizzle(POSTGRES_URL);

// Load netids by year data
const netidsByYearPath = resolve(__dirname, '../netids_by_year.json');
const netidsByYearData: Record<number, string[]> = JSON.parse(readFileSync(netidsByYearPath, 'utf-8'));

// Create a reverse lookup map: netid -> year
const netidToYearMap = new Map<string, number>();
for (const [year, netids] of Object.entries(netidsByYearData)) {
    for (const netid of netids) {
        netidToYearMap.set(netid, parseInt(year));
    }
}

console.log('Populating user table...\n');
// Fetch all auth users with pagination
async function fetchAuthUsers() {
    console.log('Fetching auth users...');
    const allUsers = [];
    let page = 1;
    const perPage = 1000000;

    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Failed to fetch users: ${error.message}`);

    allUsers.push(...data.users);


    console.log(`✅ Fetched ${allUsers.length} users\n`);
    return allUsers;
}

// Fetch all private profiles
async function fetchPrivateProfiles() {
    console.log('Fetching private profiles...');
    const { data, error } = await supabase.from('private_profiles').select('id, is_admin');

    if (error) throw new Error(`Failed to fetch profiles: ${error.message}`);

    const profilesMap = new Map(data?.map(p => [p.id, p.is_admin || false]) || []);
    console.log(`✅ Loaded ${profilesMap.size} profiles\n`);
    return profilesMap;
}

// Helper functions
const getNetId = (email: string): string | null => {
    // TODO: Implement netid extraction logic
    const netid = email.split('@')[0];
    if (netid.length === 6 && netid.match(/^[a-z]{2}\d{4}$/)) {
        return netid;
    }

    // How to get netid from email if email is alias?
    return null;
};



const getClassYear = (netid: string): number => {
    // Look up the netid in the netids_by_year data
    const year = netidToYearMap.get(netid);
    return year || 0;
};

const getIsAdmin = (userId: string, profiles: Map<string, boolean>) => profiles.get(userId) || false;

// Check if user exists in PostgreSQL
async function userExists(supabaseId: string) {
    const result = await db.select().from(usersTable).where(eq(usersTable.supabase_id, supabaseId)).limit(1);
    return result.length > 0;
}

// Process single user
async function processUser(user: any, profiles: Map<string, boolean>) {
    if (!user.id || !user.email) return { skipped: true, reason: 'missing id/email' };

    if (await userExists(user.id)) return { skipped: true, reason: 'already exists' };

    const netid = getNetId(user.email);
    if (!netid) return { skipped: true, reason: 'no valid netid' };

    await db.insert(usersTable).values({
        supabase_id: user.id,
        email: user.email,
        netid: netid,
        year: getClassYear(netid),
        isAdmin: getIsAdmin(user.id, profiles),
        theme: {},
    });

    return { inserted: true, netid, isAdmin: getIsAdmin(user.id, profiles) };
}

// Main migration
export async function migrateUsers() {
    try {
        const [users, profiles] = await Promise.all([fetchAuthUsers(), fetchPrivateProfiles()]);

        const stats = { inserted: 0, skipped: 0, errors: 0 };

        for (const user of users) {
            try {
                const result = await processUser(user, profiles);

                if (result.inserted) {
                    // console.log(`✅ ${user.email} (${result.netid}, admin: ${result.isAdmin})`);
                    stats.inserted++;
                } else if (result.skipped) {
                    // console.log(`⏭️  ${user.email} (${result.reason})`);
                    stats.skipped++;
                }
            } catch (err) {
                console.error(`❌ ${user.email}: ${err}`);
                stats.errors++;
            }
        }

        return stats;
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}