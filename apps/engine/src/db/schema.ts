// src/db/schema.ts
// Author(s): Joshua Lau

import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  smallint,
  integer,
  real,
  pgEnum,
  boolean,
  serial,
  jsonb,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";

//----------------------------------------------------------------------
// Enums
//----------------------------------------------------------------------

export const statusEnum = pgEnum("status", ["open", "closed", "canceled"]);

//----------------------------------------------------------------------
// Tables
//----------------------------------------------------------------------

export const users = pgTable("users", {
  id: serial("id").primaryKey().notNull(),
  supabase_id: text("supabase_id").notNull().unique(),
  email: text("email").notNull(),
  netid: text("netid").notNull(),
  year: smallint("year").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  theme: jsonb("theme").notNull().default({}),
});

export const userRelations = relations(users, ({ one, many }) => ({
  feedback: many(feedback),
  schedules: many(schedules),
  customEvents: many(customEvents),
  analytics: many(analytics),
  icals: one(icals, {
    fields: [users.id],
    references: [icals.userId],
  }),
}));

export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey().notNull(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  feedback: text("feedback").notNull(),
  isResolved: boolean("is_resolved").notNull().default(false),
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`now()`),
});

export const feedbackRelations = relations(feedback, ({ one }) => ({
  user: one(users, {
    fields: [feedback.userId],
    references: [users.id],
  }),
}));

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey().notNull(),
  relativeId: integer("relative_id").notNull(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  isPublic: boolean("is_public").notNull().default(false),
  term: smallint("term").notNull(),
});

export const scheduleRelations = relations(schedules, ({ one, many }) => ({
  scheduleCourseMap: many(scheduleCourseMap),
  scheduleEventMap: many(scheduleEventMap),
  user: one(users, {
    fields: [schedules.userId],
    references: [users.id],
  }),
}));

export const icals = pgTable("icals", {
  id: serial("id").primaryKey().notNull(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  scheduleId: integer("schedule_id")
    .notNull()
    .references(() => schedules.id),
  url: text("url").notNull(),
});

export const icalRelations = relations(icals, ({ one }) => ({
  user: one(users, {
    fields: [icals.userId],
    references: [users.id],
  }),
  schedule: one(schedules, {
    fields: [icals.scheduleId],
    references: [schedules.id],
  }),
}));

export const customEvents = pgTable("custom_events", {
  id: serial("id").primaryKey().notNull(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  times: jsonb("times").notNull(),
});

export const customEventRelations = relations(customEvents, ({ one, many }) => ({
  scheduleEventMap: many(scheduleEventMap),
  user: one(users, {
    fields: [customEvents.userId],
    references: [users.id],
  }),
}));

export const courses = pgTable("courses", {
  // concat(listing_id, '-', term)
  id: text("id").primaryKey().notNull(),
  listingId: text("listing_id").notNull(),
  term: smallint("term").notNull(),

  // e.g., "COS126 / EGR126"
  code: text("code").notNull(),

  // e.g. "Computer Science: An Interdisciplinary Approach"
  title: text("title").notNull(),

  description: text("description").notNull(),

  status: statusEnum("status").notNull().default("open"),
  dists: text("dists").array(),
  gradingBasis: text("grading_basis").notNull(),
  hasFinal: boolean("has_final"),
});

export const courseRelations = relations(courses, ({ one, many }) => ({
  courseInstructorMap: many(courseInstructorMap),
  scheduleCourseMap: many(scheduleCourseMap),
  courseDepartmentMap: many(courseDepartmentMap),
  sections: many(sections),
  evaluations: one(evaluations, {
    fields: [courses.id],
    references: [evaluations.courseId],
  }),
}));

export const sections = pgTable("sections", {
  id: serial("id").primaryKey().notNull(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id),
  title: text("title").notNull(),
  num: text("num").notNull(),
  room: text("room"),
  tot: smallint("tot").notNull(),
  cap: smallint("cap").notNull(),
  days: smallint("days").notNull(),
  startTime: integer("start_time").notNull(),
  endTime: integer("end_time").notNull(),
  status: statusEnum("status").notNull().default("open"),
});

export const sectionRelations = relations(sections, ({ one }) => ({
  courses: one(courses, {
    fields: [sections.courseId],
    references: [courses.id],
  }),
}));

export const departments = pgTable("departments", {
  code: text("code").primaryKey().notNull(),
  name: text("name"),
});

export const departmentRelations = relations(departments, ({ many }) => ({
  courseDepartmentMap: many(courseDepartmentMap),
  instructors: many(instructors),
}));

export const instructors = pgTable("instructors", {
  // Data from OIT API
  netid: text("netid").primaryKey().notNull(),
  emplid: text("emplid").notNull(),
  name: text("name").notNull(),
  fullName: text("full_name").notNull(),

  // Data from scraping advanced people search
  department: text("department"),
  email: text("email"),
  office: text("office"),

  // Data derived from scraping course evals
  rating: real("rating"),
  ratingUncertainty: real("rating_uncertainty"),
  numRatings: integer("num_ratings"),
});

export const instructorRelations = relations(instructors, ({ one, many }) => ({
  courseInstructorMap: many(courseInstructorMap),
  department: one(departments, {
    fields: [instructors.department],
    references: [departments.code],
  }),
}));

export const evaluations = pgTable("evaluations", {
  id: serial("id").primaryKey().notNull(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id),
  numComments: integer("num_comments"),
  comments: text("comments").array(),
  summary: text("summary"),
  rating: real("rating"),
  ratingSource: text("rating_source"),
  metadata: jsonb("metadata"),
});

export const evaluationRelations = relations(evaluations, ({ one }) => ({
  course: one(courses, {
    fields: [evaluations.courseId],
    references: [courses.id],
  }),
}));

export const scheduleCourseMap = pgTable(
  "schedule_course_map",
  {
    scheduleId: integer("schedule_id")
      .notNull()
      .references(() => schedules.id),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id),
    color: smallint("color").notNull(),
    isComplete: boolean("is_complete").notNull().default(false),
    confirms: jsonb("confirms").notNull().default({}),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.scheduleId, t.courseId] }),
  })
);

export const scheduleCourseMapRelations = relations(scheduleCourseMap, ({ one }) => ({
  schedule: one(schedules, {
    fields: [scheduleCourseMap.scheduleId],
    references: [schedules.id],
  }),
  course: one(courses, {
    fields: [scheduleCourseMap.courseId],
    references: [courses.id],
  }),
}));

export const scheduleEventMap = pgTable(
  "schedule_event_map",
  {
    scheduleId: integer("schedule_id")
      .notNull()
      .references(() => schedules.id),
    customEventId: integer("custom_event_id")
      .notNull()
      .references(() => customEvents.id),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.scheduleId, t.customEventId] }),
  })
);

export const scheduleEventMapRelations = relations(scheduleEventMap, ({ one }) => ({
  schedule: one(schedules, {
    fields: [scheduleEventMap.scheduleId],
    references: [schedules.id],
  }),
  customEvent: one(customEvents, {
    fields: [scheduleEventMap.customEventId],
    references: [customEvents.id],
  }),
}));

export const courseDepartmentMap = pgTable(
  "course_department_map",
  {
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id),
    departmentCode: text("department_code")
      .notNull()
      .references(() => departments.code),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.courseId, t.departmentCode] }),
  })
);

export const courseDepartmentMapRelations = relations(courseDepartmentMap, ({ one }) => ({
  course: one(courses, {
    fields: [courseDepartmentMap.courseId],
    references: [courses.id],
  }),
  department: one(departments, {
    fields: [courseDepartmentMap.departmentCode],
    references: [departments.code],
  }),
}));

export const courseInstructorMap = pgTable(
  "course_instructor_map",
  {
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id),
    instructorId: text("instructor_id")
      .notNull()
      .references(() => instructors.netid),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.courseId, t.instructorId] }),
  })
);

export const courseInstructorMapRelations = relations(courseInstructorMap, ({ one }) => ({
  course: one(courses, {
    fields: [courseInstructorMap.courseId],
    references: [courses.id],
  }),
  instructor: one(instructors, {
    fields: [courseInstructorMap.instructorId],
    references: [instructors.netid],
  }),
}));

export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey().notNull(),
  userId: integer("user_id").references(() => users.id),
  event: text("event").notNull(),
  page: text("page").notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`now()`),
});

export const analyticsRelations = relations(analytics, ({ one }) => ({
  user: one(users, {
    fields: [analytics.userId],
    references: [users.id],
  }),
}));
