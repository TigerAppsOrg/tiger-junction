# TigerJunction Update Guide

When the courses for a new semester are released, there are a few steps that need to be taken to update the codebase and database. Please follow the steps below carefully to update the app.

## Step 1: Update the Database

Login to Supabase and go to the `Database` tab on the left bar. Click on the `functions` subtab and click the 3 dots next to `handle_new_user` and click `Edit function`. In the function definition, there will be a part that looks like:

```sql
-- Create default schedules for terms (1242, 1234, 1232)
INSERT INTO public.schedules (user_id, title, term)
VALUES (new.id, 'My Schedule', 1242),
       (new.id, 'My Schedule', 1234),
       (new.id, 'My Schedule', 1244);
```

Find the oldest term and replace it with the new term. For example, in the example above, the oldest term is `1234`, so you would replace that with whatever the new term is.

Additionally, you should update the [`db/createUser.sql`](db/createUser.sql) file in the codebase with the new term. While this is not necessary, it is good practice to keep the codebase up to date with the database.

## Step 2: Update the Codebase

Create a new branch and update the term configuration in:

- [`apps/web/src/lib/changeme.ts`](apps/web/src/lib/changeme.ts): planner tabs, active/default terms, calendar dates, and section-loading state.
- [`apps/ask-gateway/app/chat_service.py`](apps/ask-gateway/app/chat_service.py): Ask AI's upcoming/default term in the system prompt. The Ask AI page does not send a term, so this must match the planner's default.
- [`apps/engine/src/mcp/tools/courses.ts`](apps/engine/src/mcp/tools/courses.ts): MCP term mappings and current/upcoming descriptions.
- [`apps/engine/src/oit/index.ts`](apps/engine/src/oit/index.ts) and [`apps/database/src/scripts/supabase/shared.ts`](apps/database/src/scripts/supabase/shared.ts): supported import terms.
- [`.github/workflows/seats-cron.yml`](.github/workflows/seats-cron.yml): manual and scheduled default term.

Commit the changes and push the branch to GitHub.

## Step 3: Check Department List

In [`src/lib/constants.ts`](src/lib/constants.ts) check the array titled DEPARTMENTS against the list of departments on the Princeton course offerings [website](https://registrar.princeton.edu/course-offerings). If there are any new departments, add them to the array. Do not remove anything from the array.

## Step 4: Populate the Database

For a new term, use the **Seats Cron** GitHub Actions workflow with the target
`term` and **import_courses** enabled. It runs the full listings/course/section
import with grading, then updates seats and syncs Redis using the repository's
existing secrets. Leave **import_courses** off for normal seat refreshes.
Supabase import failures stop the command with a nonzero exit before Redis sync
and the subsequent seat refresh. Earlier database writes are not rolled back;
fix the reported failure and rerun the import before considering the term ready.
The scheduled hourly run remains a seat refresh only. Add the new term to the
allowlist before dispatching; when testing a term-update branch, select that
branch in the workflow's **Run workflow** menu.

Database population can also be done via CLI scripts in `apps/database`. Make sure your `apps/database/.env` file is configured with the required environment variables (see `apps/database/.env.example`): `PUBLIC_SUPABASE_URL`, `SERVICE_ROLE_KEY`, `API_ACCESS_TOKEN`, `REDIS_PASSWORD`, and `REG_COOKIE`.

Before running the scripts, add the new term code to the `TERMS` array in `apps/database/src/scripts/supabase/shared.ts`, or the scripts will reject it as invalid.

From the `apps/database` directory, run the following commands in order:

1. **Push Listings + Courses + Redis:** `bun run update-supabase <term> --grading`
   - This populates listings, courses (with grading info), and syncs to Redis in one step.
   - The `--grading` (or `-g`) flag refreshes grading fields. Omit it if you don't need to update grading.
   - This will take a while (~30 minutes).

2. **Push Ratings:** `bun run ratings-supabase <term>`
   - This scrapes course evaluation ratings and updates them in Supabase, then syncs to Redis.
   - Requires `REG_COOKIE` to be set (a valid `PHPSESSID` cookie from the registrar evaluations site).
   - You can optionally pass a `startIndex` as a second argument to resume from a specific course if the script is interrupted.

### Refresh the engine catalog and AWS scheduler

Supabase/Redis and the engine Postgres database are separate catalogs. The
**Seats Cron** workflow updates Supabase/Redis only; PI/MCP reads engine Postgres.
Verify both catalogs before declaring a new term available.

On the AWS `junction-engine` instance (accessible through AWS CLI/SSM):

- `tigerjunction-update-courses.timer` fires hourly at :17, with up to two minutes
  of jitter. `/usr/local/bin/tigerjunction-update-courses.sh` chooses hourly runs
  during active windows and a daily graded run otherwise.
- Update `/etc/tigerjunction-cron.conf` at each rollover. For Spring 2027, use
  `TJ_TERMS="1274 1272"` so the upcoming and current semesters both refresh, and
  include `2027-01-25:2027-04-23` in `TJ_ACTIVE_WINDOWS` alongside the Fall window.
  These settings are not automatically deployed from this repository.
- The wrapper runs the Supabase importer from `/opt/tiger-junction/apps/database`,
  then `bun run cli update` from `/opt/junction-engine` for the latest published
  OIT term. Deploy importer changes to the correct checkout: Engine CD updates
  `/opt/junction-engine`, not the separate Supabase importer checkout.
- Start a catch-up run with `systemctl start --no-block tigerjunction-update-courses.service`.
  Check `journalctl -u tigerjunction-update-courses.service` and require both the
  term import and engine update to succeed. The wrapper's lock prevents overlap.
- Verify nonzero course and section counts for the new term in both databases,
  then query it through the existing engine course/MCP endpoint. A successful
  seat refresh alone does not establish that the engine catalog is populated.

OIT can list a department with no offerings and return a null-code term without
`subjects` for that department (for example CTL in Spring 2027). The engine must
skip that empty department without aborting the term import; malformed and
wrong-term responses must still fail visibly.

## Step 5: Test and Deploy

Run the branch locally with `npx sst dev` and `npm run dev` (in a separate terminal window). Play around with the app to ensure that there are no bugs. If there are, fix them and push the changes to the branch. Once the update branch is bug-free, create a pull request and merge the branch into `main`. GitHub Actions will automatically create a production deployment of the new branch through SST onto AWS. Once the branch has been merged, you can delete the branch.

## Step 6: Clean Up the Database

**WARNING: EXERCISE EXTREME CAUTION WHILE PERFORMING THIS STEP!!!**

In Supabase, go to the `Table Editor` tab on the left bar. Click on the `schedules` table and filter by the `term` column for the term that was just removed. Delete all of the rows that show up. Similarly, in the `courses` table, filter by the `term` column for the term that was just removed. Delete all of the rows that show up. _DO NOT DELETE ANY ROWS THAT ARE NOT IN THE TERM THAT WAS JUST REMOVED_. If you do, it is game over as there is no way to recover the data. If you are unsure, please ask someone for help.
