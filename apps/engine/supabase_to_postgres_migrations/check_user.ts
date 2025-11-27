import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, 'modules/.env') });

const { PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

const supabase = createClient(PUBLIC_SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const userId = '9cfe98c7-c868-4864-9260-f86e0bb40ec9';

async function checkUserSchedules() {
    // Check if user exists in auth
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    const user = authData?.users.find(u => u.id === userId);

    console.log('User in auth:', user ? `Found: ${user.email}` : 'Not found');

    // Check schedules
    const { data: schedules, error: schedError } = await supabase
        .from('schedules')
        .select('*')
        .eq('user_id', userId);

    if (schedError) {
        console.error('Error fetching schedules:', schedError);
    } else {
        console.log(`\nSchedules for user ${userId}:`);
        console.log(`Total: ${schedules?.length || 0}`);
        if (schedules && schedules.length > 0) {
            console.log(JSON.stringify(schedules, null, 2));
        }
    }
}

checkUserSchedules();
