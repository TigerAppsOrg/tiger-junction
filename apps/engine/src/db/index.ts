// src/db/index.ts
// Author(s): Joshua Lau

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { I_DB } from "./interface";
import OIT from "../oit";
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

  public async updateOitData() {
    await this.testConnection();

    const oit = new OIT();
    const latestTerm = await oit.getLatestTermCode();
    if (!latestTerm)
      throw new Error("No terms found in OIT data. Please check OIT API connectivity.");

    console.log(`Fetching all course data for term ${latestTerm}...`);
    // ! This takes a while to run (several minutes)
    const courses = await oit.getAllCourseData(latestTerm);
    console.log(`Fetched ${courses.length} courses. Starting database updates...`);

    try {
      // Extract unique departments from courses
      const departmentMap = new Set<string>();
      for (const course of courses) {
        // Extract department codes from the course code (e.g., "COS126 / EGR126" -> ["COS", "EGR"])
        // Department codes are always exactly 3 letters
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

      // Insert/update departments
      console.log(`Upserting ${departmentMap.size} departments...`);
      for (const code of departmentMap) {
        await this.db
          .insert(schema.departments)
          .values({
            code,
          })
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
              emplid: "", // OIT_FullInstructor doesn't include emplid, using empty string
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

        // Insert/update course
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

        // Delete existing sections for this course to handle removed sections
        await this.db
          .delete(schema.sections)
          .where(sql`${schema.sections.courseId} = ${course.id}`);

        // Insert sections
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

        // Delete existing course-department mappings for this course
        await this.db
          .delete(schema.courseDepartmentMap)
          .where(sql`${schema.courseDepartmentMap.courseId} = ${course.id}`);

        // Insert course-department mappings
        // Department codes are always exactly 3 letters
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

        // Delete existing course-instructor mappings for this course
        await this.db
          .delete(schema.courseInstructorMap)
          .where(sql`${schema.courseInstructorMap.courseId} = ${course.id}`);

        // Insert course-instructor mappings
        for (const instructor of course.instructors) {
          await this.db.insert(schema.courseInstructorMap).values({
            courseId: course.id,
            instructorId: instructor.netid,
          });
        }
      }

      console.log(`Database update complete! Updated ${courses.length} courses.`);
    } catch (error) {
      console.error("Error updating OIT data:", error);
      throw error;
    }
  }
}
