import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, 'modules/.env') });

const { PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

const supabase = createClient(PUBLIC_SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const getNetId = (email: string): string | null => {
    const netid = email.split('@')[0];
    if (netid.length === 6 && netid.match(/^[a-z]{2}\d{4}$/)) {
        return netid;
    }
    return null;
};

async function checkSkippedScheduleUsers() {
    console.log('Fetching all schedules...');
    const { data: schedules, error: schedError } = await supabase
        .from('schedules')
        .select('user_id');

    if (schedError) {
        console.error('Error fetching schedules:', schedError);
        return;
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set(schedules?.map(s => s.user_id) || [])];
    console.log(`Found ${uniqueUserIds.length} unique users with schedules`);

    // Fetch all auth users
    console.log('Fetching auth users...');
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000000
    });

    if (authError) {
        console.error('Error fetching auth users:', authError);
        return;
    }

    const authUserIds = new Set(authData.users.map(u => u.id));

    // Find users with schedules but not in auth
    const orphanedUserIds = uniqueUserIds.filter(id => !authUserIds.has(id));

    console.log(`\nFound ${orphanedUserIds.length} users with schedules but no auth account`);

    // Write to file
    const outputPath = './supabase_to_postgres_migrations/orphaned_schedule_users.txt';
    writeFileSync(outputPath, orphanedUserIds.join('\n'));
    console.log(`\n✅ Wrote orphaned user IDs to ${outputPath}`);

    // Now check users who ARE in auth but don't have valid netids
    console.log('\nChecking users with invalid netids...');
    const usersWithoutNetid: Array<{ id: string, email: string }> = [];

    for (const user of authData.users) {
        if (user.email && !getNetId(user.email)) {
            usersWithoutNetid.push({ id: user.id, email: user.email });
        }
    }

    console.log(`Found ${usersWithoutNetid.length} auth users without valid netids`);

    // Check how many of these have schedules
    const usersWithoutNetidButWithSchedules = usersWithoutNetid.filter(u =>
        uniqueUserIds.includes(u.id)
    );

    console.log(`Of those, ${usersWithoutNetidButWithSchedules.length} have schedules`);

    // Write these to a file
    const invalidNetidPath = './supabase_to_postgres_migrations/users_with_schedules_no_netid.txt';
    const content = usersWithoutNetidButWithSchedules
        .map(u => `${u.id}\t${u.email}`)
        .join('\n');
    writeFileSync(invalidNetidPath, content);
    console.log(`\n✅ Wrote users with schedules but no valid netid to ${invalidNetidPath}`);

    console.log('\n=== Summary ===');
    console.log(`Total unique users with schedules: ${uniqueUserIds.length}`);
    console.log(`Users with schedules but no auth account: ${orphanedUserIds.length}`);
    console.log(`Users with schedules but invalid netid: ${usersWithoutNetidButWithSchedules.length}`);
    console.log(`Total skipped schedules expected: ${orphanedUserIds.length + usersWithoutNetidButWithSchedules.length} users`);
}

checkSkippedScheduleUsers();
