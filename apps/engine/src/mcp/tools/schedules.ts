import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { z } from "zod";
import { eq, ilike, and, asc, sql } from "drizzle-orm";
import * as schema from "../../db/schema.js";

interface TimeSlot {
  days: number;
  startTime: number;
  endTime: number;
}

function timeSlotsOverlap(a: TimeSlot, b: TimeSlot): boolean {
  if ((a.days & b.days) === 0) return false;
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

export function registerScheduleTools(server: McpServer, db: NodePgDatabase) {
  server.tool(
    "get_user_schedules",
    "Get all schedules for a user, optionally filtered by term.",
    {
      userId: z.number().describe("User ID"),
      term: z.number().optional().describe("Term code to filter by"),
    },
    async ({ userId, term }) => {
      const conditions = [eq(schema.schedules.userId, userId)];
      if (term) conditions.push(eq(schema.schedules.term, term));

      const userSchedules = await db
        .select()
        .from(schema.schedules)
        .where(and(...conditions))
        .orderBy(asc(schema.schedules.term));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ count: userSchedules.length, schedules: userSchedules }, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "get_schedule_details",
    "Get full details of a schedule including its courses, sections, meeting times, and any time conflicts.",
    {
      scheduleId: z.number().describe("Schedule ID"),
    },
    async ({ scheduleId }) => {
      const schedule = await db
        .select()
        .from(schema.schedules)
        .where(eq(schema.schedules.id, scheduleId));

      if (schedule.length === 0) {
        return { content: [{ type: "text" as const, text: "Schedule not found." }], isError: true };
      }

      const courseMappings = await db
        .select({
          courseId: schema.scheduleCourseMap.courseId,
          color: schema.scheduleCourseMap.color,
          code: schema.courses.code,
          title: schema.courses.title,
        })
        .from(schema.scheduleCourseMap)
        .innerJoin(schema.courses, eq(schema.scheduleCourseMap.courseId, schema.courses.id))
        .where(eq(schema.scheduleCourseMap.scheduleId, scheduleId));

      const allSections: {
        courseCode: string;
        sectionTitle: string;
        days: number;
        startTime: number;
        endTime: number;
        room: string | null;
        status: string;
      }[] = [];

      for (const mapping of courseMappings) {
        const sections = await db
          .select()
          .from(schema.sections)
          .where(eq(schema.sections.courseId, mapping.courseId));

        for (const s of sections) {
          allSections.push({
            courseCode: mapping.code,
            sectionTitle: s.title,
            days: s.days,
            startTime: s.startTime,
            endTime: s.endTime,
            room: s.room,
            status: s.status,
          });
        }
      }

      const conflicts: string[] = [];
      for (let i = 0; i < allSections.length; i++) {
        for (let j = i + 1; j < allSections.length; j++) {
          if (timeSlotsOverlap(allSections[i], allSections[j])) {
            conflicts.push(
              `${allSections[i].courseCode} (${allSections[i].sectionTitle}) overlaps with ${allSections[j].courseCode} (${allSections[j].sectionTitle})`
            );
          }
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                schedule: schedule[0],
                courses: courseMappings,
                sections: allSections,
                conflicts: conflicts.length > 0 ? conflicts : "No conflicts detected",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "find_courses_that_fit",
    "Find courses that don't conflict with an existing schedule. Optionally filter by department or distribution area.",
    {
      scheduleId: z.number().describe("Schedule ID to check against"),
      department: z.string().optional().describe("Department code (e.g., COS)"),
      dist: z.string().optional().describe("Distribution area (e.g., LA)"),
    },
    async ({ scheduleId, department, dist }) => {
      const schedule = await db
        .select()
        .from(schema.schedules)
        .where(eq(schema.schedules.id, scheduleId));

      if (schedule.length === 0) {
        return { content: [{ type: "text" as const, text: "Schedule not found." }], isError: true };
      }

      const existingCourseIds = await db
        .select({ courseId: schema.scheduleCourseMap.courseId })
        .from(schema.scheduleCourseMap)
        .where(eq(schema.scheduleCourseMap.scheduleId, scheduleId));

      const occupiedSlots: TimeSlot[] = [];
      for (const { courseId } of existingCourseIds) {
        const sections = await db
          .select({ days: schema.sections.days, startTime: schema.sections.startTime, endTime: schema.sections.endTime })
          .from(schema.sections)
          .where(eq(schema.sections.courseId, courseId));
        occupiedSlots.push(...sections);
      }

      const courseConditions = [eq(schema.courses.term, schedule[0].term)];
      if (department) courseConditions.push(ilike(schema.courses.code, `${department}%`));
      if (dist) {
        courseConditions.push(sql`${dist} = ANY(${schema.courses.dists})`);
      }

      const candidates = await db
        .select({ id: schema.courses.id, code: schema.courses.code, title: schema.courses.title })
        .from(schema.courses)
        .where(and(...courseConditions))
        .orderBy(asc(schema.courses.code))
        .limit(200);

      const fitting: { id: string; code: string; title: string }[] = [];

      for (const candidate of candidates) {
        if (existingCourseIds.some((e) => e.courseId === candidate.id)) continue;

        const sections = await db
          .select({ days: schema.sections.days, startTime: schema.sections.startTime, endTime: schema.sections.endTime })
          .from(schema.sections)
          .where(eq(schema.sections.courseId, candidate.id));

        const hasConflict = sections.some((s) =>
          occupiedSlots.some((o) => timeSlotsOverlap(s, o))
        );

        if (!hasConflict) {
          fitting.push(candidate);
        }

        if (fitting.length >= 30) break;
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ scheduleId, count: fitting.length, courses: fitting }, null, 2),
          },
        ],
      };
    }
  );
}
