import { migrateUsers } from './modules/migrate_users.ts';
import { migrateSchedules } from './modules/migrate_schedules.ts';
import { migrateCourses } from './modules/migrate_courses.ts';
import { migrateSections } from './modules/migrate_sections.ts';

console.log('Starting migration...\n');

async function runMigrations() {
    // Run courses and users in parallel (they don't depend on each other)
    const [coursesStats, usersStats] = await Promise.all([
        migrateCourses(),
        migrateUsers()
    ]);

    // Run sections after courses complete (sections depend on courses)
    const sectionsStats = await migrateSections();

    // Run schedules after users complete (schedules depend on users)
    const schedulesStats = await migrateSchedules();

    // Print consolidated dashboard
    console.log('\n');
    console.log('═'.repeat(60));
    console.log('                   MIGRATION DASHBOARD');
    console.log('═'.repeat(60));
    console.log('');
    console.log('Courses Migration:');
    console.log(`  ✅ Inserted: ${coursesStats.inserted} | ⏭️  Skipped: ${coursesStats.skipped} | ❌ Errors: ${coursesStats.errors}`);
    console.log('');
    console.log('Sections Migration:');
    console.log(`  ✅ Inserted: ${sectionsStats.inserted} | ⏭️  Skipped: ${sectionsStats.skipped} | ❌ Errors: ${sectionsStats.errors}`);
    console.log('');
    console.log('Users Migration:');
    console.log(`  ✅ Inserted: ${usersStats.inserted} | ⏭️  Skipped: ${usersStats.skipped} | ❌ Errors: ${usersStats.errors}`);
    console.log('');
    console.log('Schedules Migration:');
    console.log(`  ✅ Inserted: ${schedulesStats.inserted} | ⏭️  Skipped: ${schedulesStats.skipped} | ❌ Errors: ${schedulesStats.errors}`);
    console.log('');
    console.log('─'.repeat(60));
    console.log('Total:');
    const totalInserted = coursesStats.inserted + sectionsStats.inserted + usersStats.inserted + schedulesStats.inserted;
    const totalSkipped = coursesStats.skipped + sectionsStats.skipped + usersStats.skipped + schedulesStats.skipped;
    const totalErrors = coursesStats.errors + sectionsStats.errors + usersStats.errors + schedulesStats.errors;
    console.log(`  ✅ Inserted: ${totalInserted} | ⏭️  Skipped: ${totalSkipped} | ❌ Errors: ${totalErrors}`);
    console.log('═'.repeat(60));
}

runMigrations();