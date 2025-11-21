# Database Migrations!

Main Schemas in Supabase:
- public: Application domain tables and views.
- auth: Authentication schema (users, sessions, identities).
- storage: File storage objects (buckets, objects).

This has the chunk of the data we need to put into
the PostgreSQL database.

## Migration Scripts

Script 1: Populate the PostgreSQL user table
    
    Some more details. We should probably take the
    Supabase-User-ID and put it into the PostgreSQL
    to make it easier to fetch from Supabase in
    other scripts.

Script 2: Populate the schedule table and link it to
the users

## Running the Migration Script

### Prerequisites

1. Add your Supabase service role key to the `.env` file in this directory:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```
   
   Get this key from: Supabase Dashboard > Settings > API > `service_role` key
   
   **Important:** The service role key is required to access the `auth.users` table. The anon key does not have permission to read from the auth schema.

### Running script.ts

From the engine app directory:
```bash
cd /Users/sainallani/Projects/tiger-junction/apps/engine
bun run supabase_to_postgres_migrations/script.ts
```

Or from this directory:
```bash
bun run script.ts
```

### What the script does

- Connects to Supabase using the service role key
- Fetches all users from the `auth.users` table using the Admin API
- Displays user count and sample user data
- Returns user data for further processing/insertion into PostgreSQL

### Next steps

After fetching the users, you'll need to:
1. Insert users into the PostgreSQL `user` table
2. Store the Supabase user ID in PostgreSQL for linking in subsequent migration scripts
3. Run additional scripts to migrate schedules, events, and feedback data
