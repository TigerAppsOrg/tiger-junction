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

Create a new branch. There is only 1 file that needs to be updated: [`src/lib/changeme.ts`](src/lib/changeme.ts). There are 5 things that need to be updated in the file, and they all have comments next to them explaining what needs to be done. Once you have updated the file, commit the changes and push the branch to GitHub.

## Step 3: Check Department List

In [`src/lib/constants.ts`](src/lib/constants.ts) check the array titled DEPARTMENTS against the list of departments on the Princeton course offerings [website](https://registrar.princeton.edu/course-offerings). If there are any new departments, add them to the array. Do not remove anything from the array.

## Step 4: Populate the Database

Run `npm run dev` in the terminal to start the development server. Once the server is running, go to `localhost:5173/admin` in your browser. This may require you to login, in which case you will have to replace `junction.tigerapps.org` with `localhost:5173` in the URL when the login page redirects you (you will receive an error if not already logged in on localhost). If you do not have admin access, grant yourself admin access by going to the `private_profiles` table in Supabase and setting the `is_admin` column to `true` for your user. _PLEASE BE CAREFUL TO NOT ACCIDENTLY GRANT ADMIN ACCESS TO SOMEONE ELSE_.

Once you are on the admin page, input the term you are adding into the term field, and click `Push Listings`. This should take less than a minute to complete. Once it is done, input the term again and check the `Refresh Grading` checkbox. Then, click `Push Courses` and wait for it to complete. This will take a while (around 30 minutes). Finally, input the term again and click `Push Ratings`. This shoudl take less than a minute to complete. Once all of these are done, you can close the server.

_Make sure to do this on localhost and not on the production site, it will timeout_.

## Step 5: Test and Deploy

Run the branch locally with `npx sst dev` and `npm run dev` (in a separate terminal window). Play around with the app to ensure that there are no bugs. If there are, fix them and push the changes to the branch. Once the update branch is bug-free, create a pull request and merge the branch into `main`. GitHub Actions will automatically create a production deployment of the new branch through SST onto AWS. Once the branch has been merged, you can delete the branch.

## Step 6: Clean Up the Database

**WARNING: EXERCISE EXTREME CAUTION WHILE PERFORMING THIS STEP!!!**

In Supabase, go to the `Table Editor` tab on the left bar. Click on the `schedules` table and filter by the `term` column for the term that was just removed. Delete all of the rows that show up. Similarly, in the `courses` table, filter by the `term` column for the term that was just removed. Delete all of the rows that show up. _DO NOT DELETE ANY ROWS THAT ARE NOT IN THE TERM THAT WAS JUST REMOVED_. If you do, it is game over as there is no way to recover the data. If you are unsure, please ask someone for help.
