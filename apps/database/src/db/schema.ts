/**
 * @file db/schema.ts
 * @description This file contains the Drizzle ORM schema for the database.
 * @author Joshua Lau
 */

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
    primaryKey
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
    customEvents: many(customEvents),
    icals: one(icals, {
        fields: [users.id],
        references: [icals.userId]
    })
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
        .default(sql`now()`)
});

export const feedbackRelations = relations(feedback, ({ one }) => ({
    user: one(users, {
        fields: [feedback.userId],
        references: [users.id]
    })
}));

export const schedules = pgTable("schedules", {
    id: serial("id").primaryKey().notNull(),
    relativeId: integer("relative_id").notNull(),
    userId: integer("user_id")
        .notNull()
        .references(() => users.id),
    title: text("title").notNull(),
    isPublic: boolean("is_public").notNull().default(false),
    term: smallint("term").notNull()
});

export const scheduleRelations = relations(schedules, ({ one, many }) => ({
    scheduleCourseMap: many(scheduleCourseMap),
    scheduleEventMap: many(scheduleEventMap),
    user: one(users, {
        fields: [schedules.userId],
        references: [users.id]
    })
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
    user: one(users, {
        fields: [icals.userId],
        references: [users.id]
    }),
    schedule: one(schedules, {
        fields: [icals.scheduleId],
        references: [schedules.id]
    })
}));

export const customEvents = pgTable("custom_events", {
    id: serial("id").primaryKey().notNull(),
    userId: integer("user_id")
        .notNull()
        .references(() => users.id),
    title: text("title").notNull(),
    times: jsonb("times").notNull()
});

export const customEventRelations = relations(
    customEvents,
    ({ one, many }) => ({
        scheduleEventMap: many(scheduleEventMap),
        user: one(users, {
            fields: [customEvents.userId],
            references: [users.id]
        })
    })
);

export const courses = pgTable("courses", {
    id: serial("id").primaryKey().notNull(),
    listingId: text("listing_id").notNull(),
    term: smallint("term").notNull(),
    code: text("code").notNull(),
    title: text("title").notNull(),
    status: statusEnum("status").notNull().default("open"),
    dists: text("dists").array(),
    gradingBasis: text("grading_basis").notNull(),
    calculatedRating: real("calculated_rating"),
    numEvals: integer("num_evals"),
    hasFinal: boolean("has_final")
});

export const courseRelations = relations(courses, ({ one, many }) => ({
    courseInstructorMap: many(courseInstructorMap),
    scheduleCourseMap: many(scheduleCourseMap),
    sections: many(sections),
    evaluations: one(evaluations, {
        fields: [courses.id],
        references: [evaluations.courseId]
    })
}));

export const sections = pgTable("sections", {
    id: serial("id").primaryKey().notNull(),
    courseId: integer("course_id")
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
    status: statusEnum("status").notNull().default("open")
});

export const sectionRelations = relations(sections, ({ one }) => ({
    courses: one(courses, {
        fields: [sections.courseId],
        references: [courses.id]
    })
}));

export const instructors = pgTable("instructors", {
    emplid: text("emplid").primaryKey().notNull(),
    name: text("name").notNull(),
    rating: real("rating"),
    numEvals: integer("num_evals")
});

export const instructorRelations = relations(instructors, ({ many }) => ({
    courseInstructorMap: many(courseInstructorMap)
}));

export const evaluations = pgTable("evaluations", {
    id: serial("id").primaryKey().notNull(),
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
    course: one(courses, {
        fields: [evaluations.courseId],
        references: [courses.id]
    })
}));

export const scheduleCourseMap = pgTable(
    "schedule_course_map",
    {
        scheduleId: integer("schedule_id")
            .notNull()
            .references(() => schedules.id),
        courseId: integer("course_id")
            .notNull()
            .references(() => courses.id),
        color: smallint("color").notNull(),
        isComplete: boolean("is_complete").notNull().default(false),
        confirms: jsonb("confirms").notNull().default({})
    },
    t => ({
        pk: primaryKey({ columns: [t.scheduleId, t.courseId] })
    })
);

export const scheduleCourseMapRelations = relations(
    scheduleCourseMap,
    ({ one }) => ({
        schedule: one(schedules, {
            fields: [scheduleCourseMap.scheduleId],
            references: [schedules.id]
        }),
        course: one(courses, {
            fields: [scheduleCourseMap.courseId],
            references: [courses.id]
        })
    })
);

export const scheduleEventMap = pgTable(
    "schedule_event_map",
    {
        scheduleId: integer("schedule_id")
            .notNull()
            .references(() => schedules.id),
        customEventId: integer("custom_event_id")
            .notNull()
            .references(() => customEvents.id)
    },
    t => ({
        pk: primaryKey({ columns: [t.scheduleId, t.customEventId] })
    })
);

export const scheduleEventMapRelations = relations(
    scheduleEventMap,
    ({ one }) => ({
        schedule: one(schedules, {
            fields: [scheduleEventMap.scheduleId],
            references: [schedules.id]
        }),
        customEvent: one(customEvents, {
            fields: [scheduleEventMap.customEventId],
            references: [customEvents.id]
        })
    })
);

export const courseInstructorMap = pgTable(
    "course_instructor_map",
    {
        courseId: integer("course_id")
            .notNull()
            .references(() => courses.id),
        instructorId: text("instructor_id")
            .notNull()
            .references(() => instructors.emplid)
    },
    t => ({
        pk: primaryKey({ columns: [t.courseId, t.instructorId] })
    })
);

export const courseInstructorMapRelations = relations(
    courseInstructorMap,
    ({ one }) => ({
        course: one(courses, {
            fields: [courseInstructorMap.courseId],
            references: [courses.id]
        }),
        instructor: one(instructors, {
            fields: [courseInstructorMap.instructorId],
            references: [instructors.emplid]
        })
    })
);
