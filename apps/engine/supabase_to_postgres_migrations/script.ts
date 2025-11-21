import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the .env file in this directory
config({ path: resolve(__dirname, '.env') });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  if (!supabaseUrl) console.error('  - PUBLIC_SUPABASE_URL');
  if (!supabaseServiceKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nNote: Accessing auth.users requires SUPABASE_SERVICE_ROLE_KEY, not the anon key.');
  process.exit(1);
}

// Create Supabase client with service role key to access auth schema
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fetchAuthUsers() {
  console.log('Connecting to Supabase...');
  console.log(`URL: ${supabaseUrl}\n`);

  try {
    // Fetch ALL users from auth.users table with pagination
    // Note: This requires service role key permissions
    const allUsers = [];
    let page = 1;
    const perPage = 10000; // Max per page
    
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage
      });

      if (error) {
        console.error('Error fetching users:', error.message);
        process.exit(1);
      }

      allUsers.push(...data.users);
      console.log(`Fetched page ${page}: ${data.users.length} users (total so far: ${allUsers.length})`);

      // Break if we got fewer users than requested (last page)
      if (data.users.length < perPage) {
        break;
      }
      
      page++;
    }

    console.log(`\nSuccessfully fetched ${allUsers.length} users from auth.users`);
    console.log('\nSample user data:');
    
    // Display first user as sample (if any exist)
    if (allUsers.length > 0) {
      const sampleUser = allUsers[0];
      console.log({
        id: sampleUser.id,
        email: sampleUser.email,
        created_at: sampleUser.created_at,
        last_sign_in_at: sampleUser.last_sign_in_at,
        // Add other fields as needed
      });
    }

    // Return all users for further processing
    return allUsers;
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

// Run the script
fetchAuthUsers()
  .then(users => {
    console.log(`\nTotal users: ${users.length}`);
    console.log('\nNext steps:');
    console.log('- Process these users and insert into PostgreSQL user table');
    console.log('- Store Supabase user ID for linking data in other migration scripts');
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
