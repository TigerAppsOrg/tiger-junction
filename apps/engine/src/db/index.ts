// src/db/index.ts
// Author(s): Joshua Lau

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { I_DB } from "./interface";
import OIT from "../oit";
import type { OIT_CourseData } from "../oit/types";
import * as schema from "./schema";

export default class DB implements I_DB {
  public db = drizzle(process.env.POSTGRES_URL!);

  constructor() {
    if (!process.env.POSTGRES_URL) {
      throw new Error("POSTGRES_URL environment variable is not set.");
    }
  }

  public async testConnection() {
    try {
      await this.db.execute(sql`SELECT 1`);
      console.log("Database connection successful.");
    } catch (error) {
      console.error("Database connection failed:", error);
      throw error;
    }
  }

  /**
   * Upserts an array of OIT_CourseData into the database, including
   * departments, instructors, sections, and mapping tables.
   */
  private async upsertCourses(courses: OIT_CourseData[]) {
    // Extract unique departments from courses
    const departmentMap = new Set<string>();
    for (const course of courses) {
      const deptCodes = course.code
        .split(" / ")
        .map((code) => {
          const match = code.match(/^([A-Z]{3})/);
          return match ? match[1] : null;
        })
        .filter((code): code is string => code !== null);

      for (const deptCode of deptCodes) {
        departmentMap.add(deptCode);
      }
    }

    console.log(`Upserting ${departmentMap.size} departments...`);
    for (const code of departmentMap) {
      await this.db
        .insert(schema.departments)
        .values({ code })
        .onConflictDoUpdate({
          target: schema.departments.code,
          set: { name: null },
        });
    }

    // Insert/update instructors
    const allInstructors = new Map();
    for (const course of courses) {
      for (const instructor of course.instructors) {
        if (!allInstructors.has(instructor.netid)) {
          allInstructors.set(instructor.netid, {
            netid: instructor.netid,
            emplid: "",
            name: instructor.name,
            fullName: instructor.full_name,
          });
        }
      }
    }

    console.log(`Upserting ${allInstructors.size} instructors...`);
    for (const instructor of allInstructors.values()) {
      await this.db
        .insert(schema.instructors)
        .values({
          netid: instructor.netid,
          emplid: instructor.emplid,
          name: instructor.name,
          fullName: instructor.fullName,
        })
        .onConflictDoUpdate({
          target: schema.instructors.netid,
          set: {
            name: instructor.name,
            fullName: instructor.fullName,
          },
        });
    }

    // Insert/update courses, sections, and mappings
    console.log(`Upserting ${courses.length} courses and their sections...`);
    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];
      if (i % 50 === 0) {
        console.log(`Progress: ${i}/${courses.length} courses processed...`);
      }

      await this.db
        .insert(schema.courses)
        .values({
          id: course.id,
          listingId: course.listing_id,
          term: parseInt(course.term),
          code: course.code,
          title: course.title,
          description: course.description,
          status: course.status,
          dists: course.dists,
          gradingBasis: course.grading_basis,
          hasFinal: course.has_final,
        })
        .onConflictDoUpdate({
          target: schema.courses.id,
          set: {
            code: course.code,
            title: course.title,
            description: course.description,
            status: course.status,
            dists: course.dists,
            gradingBasis: course.grading_basis,
            hasFinal: course.has_final,
          },
        });

      await this.db
        .delete(schema.sections)
        .where(sql`${schema.sections.courseId} = ${course.id}`);

      for (const section of course.sections) {
        await this.db.insert(schema.sections).values({
          courseId: section.course_id,
          title: section.title,
          num: section.num,
          room: section.room,
          tot: section.tot,
          cap: section.cap,
          days: section.days,
          startTime: section.start_time,
          endTime: section.end_time,
          status: section.status,
        });
      }

      await this.db
        .delete(schema.courseDepartmentMap)
        .where(sql`${schema.courseDepartmentMap.courseId} = ${course.id}`);

      const deptCodes = course.code
        .split(" / ")
        .map((code) => {
          const match = code.match(/^([A-Z]{3})/);
          return match ? match[1] : null;
        })
        .filter((code): code is string => code !== null);

      for (const deptCode of deptCodes) {
        await this.db.insert(schema.courseDepartmentMap).values({
          courseId: course.id,
          departmentCode: deptCode,
        });
      }

      await this.db
        .delete(schema.courseInstructorMap)
        .where(sql`${schema.courseInstructorMap.courseId} = ${course.id}`);

      for (const instructor of course.instructors) {
        await this.db.insert(schema.courseInstructorMap).values({
          courseId: course.id,
          instructorId: instructor.netid,
        });
      }
    }
  }

  public async updateOitData() {
    await this.testConnection();

    const oit = new OIT();
    const latestTerm = await oit.getLatestTermCode();
    if (!latestTerm)
      throw new Error("No terms found in OIT data. Please check OIT API connectivity.");

    console.log(`Fetching all course data for term ${latestTerm}...`);
    const courses = await oit.getAllCourseData(latestTerm);
    console.log(`Fetched ${courses.length} courses. Starting database updates...`);

    try {
      await this.upsertCourses(courses);
      console.log(`Database update complete! Updated ${courses.length} courses.`);
    } catch (error) {
      console.error("Error updating OIT data:", error);
      throw error;
    }
  }

  public async updateHistoricalOitData() {
    await this.testConnection();

    const oit = new OIT();
    const terms = await oit.getAllTermCodes();
    if (terms.length === 0)
      throw new Error("No terms found in OIT data. Please check OIT API connectivity.");

    console.log(`Found ${terms.length} terms: ${terms.join(", ")}`);

    let totalCourses = 0;
    for (let t = 0; t < terms.length; t++) {
      const term = terms[t];
      const termStart = Date.now();
      console.log(`\n[${t + 1}/${terms.length}] Fetching course data for term ${term}...`);

      try {
        const courses = await oit.getAllCourseData(term);
        console.log(`Fetched ${courses.length} courses for term ${term}. Upserting...`);
        await this.upsertCourses(courses);
        totalCourses += courses.length;
        const elapsed = ((Date.now() - termStart) / 1000).toFixed(1);
        console.log(`Term ${term} complete (${courses.length} courses in ${elapsed}s).`);
      } catch (error) {
        console.error(`Error processing term ${term}:`, error);
        console.log("Continuing with next term...");
      }
    }

    console.log(`\nHistorical update complete! Processed ${totalCourses} courses across ${terms.length} terms.`);
  }

  public async updateEvals() {
    await this.testConnection();

    const oit = new OIT();

    const courses = await this.db
      .select({ listingId: schema.courses.listingId })
      .from(schema.courses);

    const uniqueListingIds = [...new Set(courses.map((c) => c.listingId))];
    console.log(`Scraping evaluations for ${uniqueListingIds.length} unique courses...`);

    let successCount = 0;
    let noEvalsCount = 0;
    let errorCount = 0;

    for (let i = 0; i < uniqueListingIds.length; i++) {
      const listingId = uniqueListingIds[i];
      if (i % 25 === 0) {
        console.log(`Progress: ${i}/${uniqueListingIds.length} courses processed...`);
      }

      try {
        const evalsByTerm = await oit.getCourseEvals(listingId);
        const termKeys = Object.keys(evalsByTerm);

        if (termKeys.length === 0) {
          noEvalsCount++;
          continue;
        }

        for (const term of termKeys) {
          const evals = evalsByTerm[term];
          if (!evals || evals.length === 0) continue;

          const evalData = evals[0];

          await this.db
            .insert(schema.evaluations)
            .values({
              listingId,
              evalTerm: term,
              numComments: evalData.numComments,
              comments: evalData.comments,
              rating: evalData.rating,
              ratingSource: evalData.ratingSource,
            })
            .onConflictDoUpdate({
              target: [schema.evaluations.listingId, schema.evaluations.evalTerm],
              set: {
                numComments: evalData.numComments,
                comments: evalData.comments,
                rating: evalData.rating,
                ratingSource: evalData.ratingSource,
              },
            });

          successCount++;
        }
      } catch (e) {
        errorCount++;
        if (i < 5 || errorCount % 50 === 0) {
          console.warn(`  Failed to scrape evals for ${listingId}: ${(e as Error).message}`);
        }
      }
    }

    console.log(
      `Evaluations update complete! inserted=${successCount}, no_evals=${noEvalsCount}, errors=${errorCount}`
    );
  }
}
