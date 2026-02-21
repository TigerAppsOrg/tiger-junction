// src/mcp/tools/courses.ts

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { z } from "zod";
import { eq, ilike, sql, asc, and } from "drizzle-orm";
import * as schema from "../../db/schema.js";

export function registerCourseTools(server: McpServer, db: NodePgDatabase) {
  server.tool(
    "search_courses",
    "Search for courses by department, text query, or distribution area. Returns course code, title, description, and status.",
    {
      term: z.number().optional().describe("Term code (e.g., 1264)"),
      department: z.string().optional().describe("3-letter department code (e.g., COS, AAS, ECO)"),
      query: z.string().optional().describe("Text to search in course title or description"),
      dist: z.string().optional().describe("Distribution area (e.g., LA, QCR, EM, EC, HA, SA, CD, SEL, SEN)"),
    },
    async ({ term, department, query, dist }) => {
      const conditions = [];

      if (term) conditions.push(eq(schema.courses.term, term));
      if (department) conditions.push(ilike(schema.courses.code, `${department}%`));
      if (query) {
        conditions.push(
          sql`(${schema.courses.title} ILIKE ${"%" + query + "%"} OR ${schema.courses.description} ILIKE ${"%" + query + "%"})`
        );
      }
      if (dist) conditions.push(sql`${dist} = ANY(${schema.courses.dists})`);

      const courses = await db
        .select({
          id: schema.courses.id,
          listingId: schema.courses.listingId,
          term: schema.courses.term,
          code: schema.courses.code,
          title: schema.courses.title,
          status: schema.courses.status,
          dists: schema.courses.dists,
          hasFinal: schema.courses.hasFinal,
        })
        .from(schema.courses)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(schema.courses.code))
        .limit(50);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ count: courses.length, courses }, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "get_course_details",
    "Get full details for a specific course including description, grading basis, distribution areas, and whether it has a final exam.",
    {
      courseId: z.string().optional().describe("Course ID (e.g., '002051-1264')"),
      code: z.string().optional().describe("Course code (e.g., 'COS 226')"),
    },
    async ({ courseId, code }) => {
      let course;
      if (courseId) {
        const rows = await db.select().from(schema.courses).where(eq(schema.courses.id, courseId));
        course = rows[0];
      } else if (code) {
        const rows = await db
          .select()
          .from(schema.courses)
          .where(ilike(schema.courses.code, `%${code}%`))
          .limit(1);
        course = rows[0];
      }

      if (!course) {
        return {
          content: [{ type: "text" as const, text: "Course not found." }],
          isError: true,
        };
      }

      const instructors = await db
        .select({ netid: schema.instructors.netid, name: schema.instructors.name })
        .from(schema.courseInstructorMap)
        .innerJoin(schema.instructors, eq(schema.courseInstructorMap.instructorId, schema.instructors.netid))
        .where(eq(schema.courseInstructorMap.courseId, course.id));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ ...course, instructors }, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "get_course_sections",
    "Get all sections for a course including meeting times, rooms, enrollment, and capacity.",
    {
      courseId: z.string().optional().describe("Course ID (e.g., '002051-1264')"),
      code: z.string().optional().describe("Course code (e.g., 'COS 226')"),
    },
    async ({ courseId, code }) => {
      let targetId = courseId;
      if (!targetId && code) {
        const rows = await db
          .select({ id: schema.courses.id })
          .from(schema.courses)
          .where(ilike(schema.courses.code, `%${code}%`))
          .limit(1);
        targetId = rows[0]?.id;
      }

      if (!targetId) {
        return { content: [{ type: "text" as const, text: "Course not found." }], isError: true };
      }

      const sections = await db
        .select()
        .from(schema.sections)
        .where(eq(schema.sections.courseId, targetId))
        .orderBy(asc(schema.sections.id));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ courseId: targetId, count: sections.length, sections }, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "list_departments",
    "List all academic departments with their codes.",
    {},
    async () => {
      const depts = await db
        .select()
        .from(schema.departments)
        .orderBy(asc(schema.departments.code));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ count: depts.length, departments: depts }, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "discover_courses",
    "Discover interesting courses by filter: 'new' (first-time offerings), 'small_seminar' (low enrollment cap), 'no_final' (no final exam), 'open' (has open sections).",
    {
      filter: z
        .enum(["new", "small_seminar", "no_final", "open"])
        .describe("Discovery filter to apply"),
      department: z.string().optional().describe("Limit to a department (e.g., COS)"),
      limit: z.number().optional().describe("Max results (default 25)"),
    },
    async ({ filter, department, limit: maxResults }) => {
      const resultLimit = maxResults ?? 25;
      const conditions = [];

      if (department) conditions.push(ilike(schema.courses.code, `${department}%`));

      if (filter === "new") {
        conditions.push(sql`${schema.courses.listingId}::int >= 17000`);
      } else if (filter === "no_final") {
        conditions.push(eq(schema.courses.hasFinal, false));
      }

      if (filter === "small_seminar" || filter === "open") {
        const subquery =
          filter === "small_seminar"
            ? sql`SELECT DISTINCT ${schema.sections.courseId} FROM ${schema.sections} WHERE ${schema.sections.cap} <= 20`
            : sql`SELECT DISTINCT ${schema.sections.courseId} FROM ${schema.sections} WHERE ${schema.sections.status} = 'open'`;

        conditions.push(sql`${schema.courses.id} IN (${subquery})`);
      }

      const courses = await db
        .select({
          id: schema.courses.id,
          code: schema.courses.code,
          title: schema.courses.title,
          status: schema.courses.status,
          dists: schema.courses.dists,
          hasFinal: schema.courses.hasFinal,
        })
        .from(schema.courses)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(schema.courses.code))
        .limit(resultLimit);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ filter, count: courses.length, courses }, null, 2),
          },
        ],
      };
    }
  );
}
