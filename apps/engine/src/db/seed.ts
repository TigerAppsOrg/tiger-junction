// src/db/seed.ts
// Seed script for local development — creates test users, schedules,
// custom events, feedback, and schedule↔course / schedule↔event links.

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

const TERM = 1264;

const SEED_USERS = [
  { email: "alice@princeton.edu", netid: "alice01", year: 2026, isAdmin: true },
  { email: "bob@princeton.edu", netid: "bob02", year: 2027, isAdmin: false },
  { email: "carol@princeton.edu", netid: "carol03", year: 2027, isAdmin: false },
  { email: "dave@princeton.edu", netid: "dave04", year: 2028, isAdmin: false },
  { email: "eve@princeton.edu", netid: "eve05", year: 2028, isAdmin: false },
];

const SCHEDULE_TEMPLATES = [
  { title: "Primary Schedule", isPublic: true },
  { title: "Backup Schedule", isPublic: false },
  { title: "Exploration", isPublic: false },
];

const COURSE_POOLS = [
  ["002051-1264", "002054-1264", "015166-1264", "002065-1264"], // COS 126, 226, 316, 333
  ["002053-1264", "016239-1264", "014294-1264", "014445-1264"], // COS 217, 240, 324, 343
  ["002060-1264", "002071-1264", "016868-1264", "012095-1264"], // COS 417, 423, 435, 445
  ["011558-1264", "002084-1264", "015210-1264", "018038-1264"], // COS 448, 480, 484, 486
  ["002095-1264", "002096-1264", "008665-1264", "014599-1264"], // COS 510, 511, 526, 534
];

const COLORS = [0, 1, 2, 3, 4, 5, 6, 7];

const EVENT_TEMPLATES = [
  {
    title: "Office Hours — COS 226",
    times: { wednesday: { start: "15:00", end: "17:00" }, friday: { start: "15:00", end: "17:00" } },
  },
  {
    title: "Study Group",
    times: { sunday: { start: "19:00", end: "22:00" } },
  },
  {
    title: "Gym",
    times: {
      monday: { start: "07:00", end: "08:00" },
      wednesday: { start: "07:00", end: "08:00" },
      friday: { start: "07:00", end: "08:00" },
    },
  },
  {
    title: "Club Meeting",
    times: { thursday: { start: "18:00", end: "19:30" } },
  },
  {
    title: "Research Lab",
    times: { tuesday: { start: "14:00", end: "17:00" }, thursday: { start: "14:00", end: "17:00" } },
  },
  {
    title: "Lunch with Friends",
    times: { monday: { start: "12:00", end: "13:00" }, wednesday: { start: "12:00", end: "13:00" } },
  },
  {
    title: "TA Session — COS 316",
    times: { tuesday: { start: "19:30", end: "21:00" } },
  },
  {
    title: "Piano Practice",
    times: { saturday: { start: "10:00", end: "12:00" } },
  },
];

const FEEDBACK_MESSAGES = [
  "Love the schedule builder! Super intuitive.",
  "Would be great to see professor ratings inline.",
  "The color picker for courses is a nice touch.",
  "Could you add iCal export support?",
  "Dark mode would be amazing.",
  "Found a bug: duplicate sections showing up for COS 226.",
  "Any plans to support graduate courses?",
  "The search is fast — nice work!",
];

export async function seed() {
  const db = drizzle(process.env.POSTGRES_URL!);

  // Verify courses exist so FK constraints won't fail
  const courseCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.courses);
  if (Number(courseCount[0].count) === 0) {
    console.error(
      "No courses in the database. Run `bun cli` to import OIT data before seeding."
    );
    process.exit(1);
  }

  console.log("Seeding database...");

  // --- Users ---
  console.log(`  Upserting ${SEED_USERS.length} users...`);
  const insertedUsers: { id: number }[] = [];
  for (const u of SEED_USERS) {
    const [row] = await db
      .insert(schema.users)
      .values(u)
      .onConflictDoNothing()
      .returning({ id: schema.users.id });
    if (row) insertedUsers.push(row);
  }
  // If users already existed, fetch their ids
  const allUsers = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .orderBy(schema.users.id);
  const userIds = allUsers.map((u) => u.id);
  console.log(`  ${userIds.length} users available (ids: ${userIds.join(", ")})`);

  // --- Schedules ---
  let scheduleCount = 0;
  const createdSchedules: { id: number; userId: number }[] = [];
  for (let ui = 0; ui < userIds.length; ui++) {
    const userId = userIds[ui];
    const numSchedules = Math.min(SCHEDULE_TEMPLATES.length, 1 + (ui % 3));
    for (let si = 0; si < numSchedules; si++) {
      const tmpl = SCHEDULE_TEMPLATES[si];
      const [sched] = await db
        .insert(schema.schedules)
        .values({
          userId,
          term: TERM,
          title: tmpl.title,
          relativeId: si,
          isPublic: tmpl.isPublic,
        })
        .returning({ id: schema.schedules.id });
      createdSchedules.push({ id: sched.id, userId });
      scheduleCount++;
    }
  }
  console.log(`  Created ${scheduleCount} schedules`);

  // --- Schedule ↔ Course links ---
  let courseLinkCount = 0;
  for (let si = 0; si < createdSchedules.length; si++) {
    const sched = createdSchedules[si];
    const pool = COURSE_POOLS[si % COURSE_POOLS.length];
    const numCourses = 2 + (si % 3); // 2–4 courses per schedule
    for (let ci = 0; ci < numCourses; ci++) {
      await db
        .insert(schema.scheduleCourseMap)
        .values({
          scheduleId: sched.id,
          courseId: pool[ci % pool.length],
          color: COLORS[(si + ci) % COLORS.length],
          isComplete: ci === 0,
          confirms: {},
        })
        .onConflictDoNothing();
      courseLinkCount++;
    }
  }
  console.log(`  Created ${courseLinkCount} schedule↔course links`);

  // --- Custom Events ---
  const createdEvents: { id: number; userId: number }[] = [];
  for (let ui = 0; ui < userIds.length; ui++) {
    const userId = userIds[ui];
    const numEvents = 2 + (ui % 3); // 2–4 events per user
    for (let ei = 0; ei < numEvents; ei++) {
      const tmpl = EVENT_TEMPLATES[(ui * 3 + ei) % EVENT_TEMPLATES.length];
      const [ev] = await db
        .insert(schema.customEvents)
        .values({ userId, title: tmpl.title, times: tmpl.times })
        .returning({ id: schema.customEvents.id });
      createdEvents.push({ id: ev.id, userId });
    }
  }
  console.log(`  Created ${createdEvents.length} custom events`);

  // --- Schedule ↔ Event links ---
  let eventLinkCount = 0;
  for (const sched of createdSchedules) {
    const userEvents = createdEvents.filter((e) => e.userId === sched.userId);
    for (const ev of userEvents) {
      await db
        .insert(schema.scheduleEventMap)
        .values({ scheduleId: sched.id, customEventId: ev.id })
        .onConflictDoNothing();
      eventLinkCount++;
    }
  }
  console.log(`  Created ${eventLinkCount} schedule↔event links`);

  // --- Feedback ---
  for (let fi = 0; fi < FEEDBACK_MESSAGES.length; fi++) {
    const userId = userIds[fi % userIds.length];
    await db.insert(schema.feedback).values({
      userId,
      feedback: FEEDBACK_MESSAGES[fi],
    });
  }
  console.log(`  Created ${FEEDBACK_MESSAGES.length} feedback entries`);

  console.log("Seeding complete!");
  process.exit(0);
}
