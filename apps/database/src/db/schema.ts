/**
 * @file db/schema.ts
 * @description This file contains the Drizzle ORM schema for the database.
 * @author Joshua Lau
 */

import { relations } from "drizzle-orm";
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
    timestamp
} from "drizzle-orm/pg-core";

//----------------------------------------------------------------------
// Enums
//----------------------------------------------------------------------

export const statusEnum = pgEnum("status", ["open", "closed", "cancelled"]);

//----------------------------------------------------------------------
// Tables
//----------------------------------------------------------------------

export const users = pgTable("users", {
    id: serial("id").primaryKey().notNull(),
    email: text("email").notNull(),
    netid: text("netid").notNull(),
    year: smallint("year").notNull(),
    isAdmin: boolean("is_admin").notNull().default(false),
    theme: jsonb("theme").notNull().default({})
});

export const userRelations = relations(users, ({ one, many }) => ({
    feedback: many(feedback),
    schedules: many(schedules),
    icals: one(icals),
    customEvents: many(customEvents)
}));

export const feedback = pgTable("feedback", {
    id: serial("id").primaryKey().notNull(),
    userId: integer("user_id")
        .notNull()
        .references(() => users.id),
    feedback: text("feedback").notNull(),
    isResolved: boolean("is_resolved").notNull().default(false),
    createdAt: timestamp("created_at").notNull().default(new Date())
});

export const feedbackRelations = relations(feedback, ({ one }) => ({
    user: one(users)
}));

export const schedules = pgTable("schedules", {
    id: serial("id").primaryKey().notNull(),
    userId: integer("user_id")
        .notNull()
        .references(() => users.id),
    title: text("title").notNull(),
    isPublic: boolean("is_public").notNull().default(false),
    term: smallint("term").notNull()
});

export const scheduleRelations = relations(schedules, ({ one, many }) => ({
    user: one(users),
    courses: many(courses),
    customEvents: many(customEvents)
}));

export const icals = pgTable("icals", {
    id: serial("id").primaryKey().notNull(),
    userId: integer("user_id")
        .notNull()
        .references(() => users.id),
    scheduleId: integer("schedule_id")
        .notNull()
        .references(() => schedules.id),
    url: text("url").notNull()
});

export const icalRelations = relations(icals, ({ one }) => ({
    user: one(users),
    schedule: one(schedules)
}));

export const customEvents = pgTable("custom_events", {
    id: serial("id").primaryKey().notNull(),
    userId: integer("user_id")
        .notNull()
        .references(() => users.id),
    title: text("title").notNull(),
    times: jsonb("times").notNull()
});

export const customEventRelations = relations(customEvents, ({ one }) => ({
    user: one(users)
}));

export const courses = pgTable("courses", {
    id: serial("id").primaryKey().notNull(),
    listingId: text("listing_id").notNull(),
    term: smallint("term").notNull(),
    code: text("code").notNull(),
    title: text("title").notNull(),
    status: statusEnum("status").notNull().default("open"),
    dists: text("dists").array(),
    gradingBasis: text("grading_basis").notNull(),
    rating: real("rating"),
    numEvals: integer("num_evals"),
    hasFinal: boolean("has_final")
});

export const courseRelations = relations(courses, ({ one, many }) => ({
    instructors: many(instructors),
    evaluations: one(evaluations),
    schedules: many(schedules)
}));

export const instructors = pgTable("instructors", {
    emplid: text("emplid").primaryKey().notNull(),
    name: text("name").notNull(),
    rating: real("rating"),
    numEvals: integer("num_evals")
});

export const instructorRelations = relations(instructors, ({ many }) => ({
    courses: many(courses)
}));

export const evaluations = pgTable("evaluations", {
    courseId: integer("course_id")
        .notNull()
        .references(() => courses.id),
    numComments: integer("num_comments"),
    comments: text("comments").array(),
    summary: text("summary"),
    rating: real("rating"),
    ratingSource: text("rating_source"),
    metadata: jsonb("metadata")
});

export const evaluationRelations = relations(evaluations, ({ one }) => ({
    course: one(courses)
}));

export const scheduleCourseMap = pgTable("schedule_course_map", {
    scheduleId: integer("schedule_id")
        .notNull()
        .references(() => schedules.id),
    courseId: integer("course_id")
        .notNull()
        .references(() => courses.id)
});

export const scheduleCourseMapRelations = relations(
    scheduleCourseMap,
    ({ one }) => ({
        schedule: one(schedules),
        course: one(courses)
    })
);

export const scheduleEventMap = pgTable("schedule_event_map", {
    scheduleId: integer("schedule_id")
        .notNull()
        .references(() => schedules.id),
    customEventId: integer("custom_event_id")
        .notNull()
        .references(() => customEvents.id)
});

export const scheduleEventMapRelations = relations(
    scheduleEventMap,
    ({ one }) => ({
        schedule: one(schedules),
        customEvent: one(customEvents)
    })
);

export const courseInstructorMap = pgTable("course_instructor_map", {
    courseId: integer("course_id")
        .notNull()
        .references(() => courses.id),
    instructorId: text("instructor_id")
        .notNull()
        .references(() => instructors.emplid)
});

export const courseInstructorMapRelations = relations(
    courseInstructorMap,
    ({ one }) => ({
        course: one(courses),
        instructor: one(instructors)
    })
);
