import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { z } from "zod";
import { eq, ilike, asc } from "drizzle-orm";
import * as schema from "../../db/schema.js";

export function registerInstructorTools(server: McpServer, db: NodePgDatabase) {
  server.tool(
    "get_instructor",
    "Get details about an instructor by their netid, including name, department, office, and rating.",
    {
      netid: z.string().describe("Instructor netid (e.g., 'rdondero')"),
    },
    async ({ netid }) => {
      const rows = await db
        .select()
        .from(schema.instructors)
        .where(eq(schema.instructors.netid, netid));

      if (rows.length === 0) {
        return { content: [{ type: "text" as const, text: `Instructor '${netid}' not found.` }], isError: true };
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(rows[0], null, 2) }],
      };
    }
  );

  server.tool(
    "search_instructors",
    "Search for instructors by name. Returns matching instructor profiles.",
    {
      name: z.string().describe("Name or partial name to search for (e.g., 'Dondero')"),
    },
    async ({ name }) => {
      const instructors = await db
        .select()
        .from(schema.instructors)
        .where(ilike(schema.instructors.fullName, `%${name}%`))
        .orderBy(asc(schema.instructors.fullName))
        .limit(25);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ count: instructors.length, instructors }, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "get_instructor_courses",
    "Get all courses taught by an instructor. Returns course codes, titles, and terms.",
    {
      netid: z.string().describe("Instructor netid (e.g., 'rdondero')"),
    },
    async ({ netid }) => {
      const courses = await db
        .select({
          courseId: schema.courseInstructorMap.courseId,
          code: schema.courses.code,
          title: schema.courses.title,
          term: schema.courses.term,
        })
        .from(schema.courseInstructorMap)
        .innerJoin(schema.courses, eq(schema.courseInstructorMap.courseId, schema.courses.id))
        .where(eq(schema.courseInstructorMap.instructorId, netid))
        .orderBy(asc(schema.courses.code));

      if (courses.length === 0) {
        return {
          content: [{ type: "text" as const, text: `No courses found for instructor '${netid}'.` }],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ netid, count: courses.length, courses }, null, 2),
          },
        ],
      };
    }
  );
}
