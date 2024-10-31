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
    serial
} from "drizzle-orm/pg-core";

//----------------------------------------------------------------------
// Enums
//----------------------------------------------------------------------

export const statusEnum = pgEnum("status", ["open", "closed", "cancelled"]);

//----------------------------------------------------------------------
// Tables
//----------------------------------------------------------------------

export const listings = pgTable("listings", {
    id: text("id").notNull().primaryKey(),
    code: text("code").notNull(),
    title: text("title").notNull(),
    aka: text("aka").array(),
    recentTerm: smallint("recent_term"),
    terms: smallint("terms").array()
});

export const listingsRelations = relations(listings, ({ many }) => ({
    courses: many(courses)
}));

export const courses = pgTable("courses", {
    id: serial("id").primaryKey().notNull(),
    listingId: text("listing_id")
        .notNull()
        .references(() => listings.id, {
            onDelete: "cascade"
        }),
    term: smallint("term").notNull(),
    code: text("code").notNull(),
    title: text("title").notNull(),
    gradingBasis: text("grading_basis").notNull(),
    dists: text("dists").array(),
    rating: real("rating"),
    status: statusEnum("status").notNull().default("open"),
    numEvals: integer("num_evals"),
    instructors: text("instructors").array(),
    hasFinal: boolean("has_final")
});

export const coursesRelations = relations(courses, ({ one }) => ({
    listing: one(listings, {
        fields: [courses.listingId],
        references: [listings.id]
    })
}));
