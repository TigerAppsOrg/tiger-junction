import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { z } from "zod";
import { eq, ilike, and, asc, sql } from "drizzle-orm";
import * as schema from "../../db/schema.js";
import { formatSection, termCodeToName } from "../helpers.js";
import { resolveCourseInput } from "../resolvers.js";

interface TimeSlot {
  days: number;
  startTime: number;
  endTime: number;
}

function timeSlotsOverlap(a: TimeSlot, b: TimeSlot): boolean {
  if ((a.days & b.days) === 0) return false;
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

function sectionTypePrefix(title: string): string {
  const match = title.match(/^([A-Z]+)/);
  return match ? match[1] : title;
}

export function registerScheduleTools(server: McpServer, db: NodePgDatabase) {
  server.tool(
    "get_user_schedules",
    "Get all schedules for a user, optionally filtered by term.",
    {
      userId: z.number().describe("User ID"),
      term: z.number().optional().describe("Term code to filter by. Mapping: 1232=Fall 2022, 1234=Spring 2023, 1242=Fall 2023, 1244=Spring 2024, 1252=Fall 2024, 1254=Spring 2025, 1262=Fall 2025, 1264=Spring 2026 (current). Codes ending in 2=Fall, ending in 4=Spring."),
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
          if (allSections[i].courseCode === allSections[j].courseCode) continue;
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
                sections: allSections.map(formatSection),
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
      limit: z.number().optional().describe("Max results to return (default 30, max 100)"),
    },
    async ({ scheduleId, department, dist, limit: maxResults }) => {
      const resultLimit = Math.min(maxResults ?? 30, 100);
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
          .select({
            title: schema.sections.title,
            days: schema.sections.days,
            startTime: schema.sections.startTime,
            endTime: schema.sections.endTime,
          })
          .from(schema.sections)
          .where(eq(schema.sections.courseId, candidate.id));

        const byType = new Map<string, typeof sections>();
        for (const s of sections) {
          const type = sectionTypePrefix(s.title);
          if (!byType.has(type)) byType.set(type, []);
          byType.get(type)!.push(s);
        }

        const fits = [...byType.values()].every((group) =>
          group.some((s) => !occupiedSlots.some((o) => timeSlotsOverlap(s, o)))
        );

        if (fits) {
          fitting.push(candidate);
        }

        if (fitting.length >= resultLimit) break;
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

  server.tool(
    "verify_schedule",
    "Validate a proposed schedule of courses. Checks for: time conflicts between sections, mixed terms, missing section types (e.g., no precept selected when required), closed/canceled sections, duplicate courses, and exceeding 7 courses. Returns valid=true or a list of issues.",
    {
      courseCodes: z.array(z.string()).min(1).max(10).describe("Array of course codes to validate together (e.g., ['COS 226', 'MAT 202', 'ECO 100'])"),
      term: z.number().optional().describe("Term code. If omitted, uses the most recent term each course is offered."),
    },
    async ({ courseCodes, term }) => {
      const issues: string[] = [];
      const resolvedCourses: {
        code: string;
        courseId: string;
        term: number;
        status: string;
        sections: { title: string; type: string; days: number; startTime: number; endTime: number; status: string; cap: number; tot: number }[];
      }[] = [];

      // Resolve each course code
      for (const code of courseCodes) {
        const resolved = await resolveCourseInput(db, { code, term });
        if (!resolved.value) {
          issues.push(resolved.error ?? `Course not found: "${code}"`);
          continue;
        }

        const rows = await db
          .select({
            id: schema.courses.id,
            code: schema.courses.code,
            term: schema.courses.term,
            status: schema.courses.status,
          })
          .from(schema.courses)
          .where(eq(schema.courses.id, resolved.value.id))
          .limit(1);

        const course = rows[0];
        if (!course) {
          issues.push(`Course not found for resolved id: "${resolved.value.id}"`);
          continue;
        }

        // Check for duplicate courses
        if (resolvedCourses.some((c) => c.courseId === course.id)) {
          issues.push(`Duplicate course: ${course.code}`);
          continue;
        }

        const sections = await db
          .select({
            title: schema.sections.title,
            days: schema.sections.days,
            startTime: schema.sections.startTime,
            endTime: schema.sections.endTime,
            status: schema.sections.status,
            cap: schema.sections.cap,
            tot: schema.sections.tot,
          })
          .from(schema.sections)
          .where(eq(schema.sections.courseId, course.id));

        resolvedCourses.push({
          code: course.code,
          courseId: course.id,
          term: course.term,
          status: course.status,
          sections: sections.map((s) => ({
            ...s,
            type: sectionTypePrefix(s.title),
            cap: s.cap ?? 0,
            tot: s.tot ?? 0,
          })),
        });
      }

      // Check: too many courses
      if (resolvedCourses.length > 7) {
        issues.push(`Too many courses: ${resolvedCourses.length} courses selected (max recommended is 7)`);
      }

      // Check: mixed terms
      const terms = [...new Set(resolvedCourses.map((c) => c.term))];
      if (terms.length > 1) {
        const termNames = terms.map((t) => `${termCodeToName(t)} (${t})`).join(", ");
        issues.push(`Mixed terms: courses span multiple semesters: ${termNames}`);
      }

      // Check: canceled courses
      for (const course of resolvedCourses) {
        if (course.status === "canceled") {
          issues.push(`Canceled course: ${course.code} is canceled`);
        }
      }

      // Check: section completeness — each section type must have at least one open option
      for (const course of resolvedCourses) {
        const byType = new Map<string, typeof course.sections>();
        for (const s of course.sections) {
          if (!byType.has(s.type)) byType.set(s.type, []);
          byType.get(s.type)!.push(s);
        }

        for (const [type, sections] of byType) {
          const allClosed = sections.every((s) => s.status === "closed");
          const allCanceled = sections.every((s) => s.status === "canceled");
          if (allCanceled) {
            issues.push(`No available ${type} sections: all ${type} sections for ${course.code} are canceled`);
          } else if (allClosed) {
            issues.push(`All ${type} sections full: all ${type} sections for ${course.code} are closed (${sections[0].tot}/${sections[0].cap} enrolled)`);
          }
        }

        if (course.sections.length === 0) {
          issues.push(`No sections: ${course.code} has no sections listed`);
        }
      }

      // Check: time conflicts between courses
      // For each course, get all possible section combinations (one per type)
      // Then check if any required section type from one course conflicts with all options of a type from another
      for (let i = 0; i < resolvedCourses.length; i++) {
        for (let j = i + 1; j < resolvedCourses.length; j++) {
          const a = resolvedCourses[i];
          const b = resolvedCourses[j];

          // Group sections by type for each course
          const aByType = new Map<string, typeof a.sections>();
          for (const s of a.sections) {
            if (!aByType.has(s.type)) aByType.set(s.type, []);
            aByType.get(s.type)!.push(s);
          }

          const bByType = new Map<string, typeof b.sections>();
          for (const s of b.sections) {
            if (!bByType.has(s.type)) bByType.set(s.type, []);
            bByType.get(s.type)!.push(s);
          }

          // Check if any section type from course A conflicts with all options of a type from course B
          for (const [aType, aSections] of aByType) {
            for (const [bType, bSections] of bByType) {
              // Check if ALL combinations conflict (meaning no valid pairing exists)
              const allConflict = aSections.every((aS) =>
                bSections.every((bS) => timeSlotsOverlap(aS, bS))
              );
              if (allConflict && aSections[0].days !== 0 && bSections[0].days !== 0) {
                issues.push(
                  `Time conflict: ${a.code} ${aType} sections all conflict with ${b.code} ${bType} sections`
                );
              }
            }
          }
        }
      }

      const valid = issues.length === 0;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                valid,
                courseCount: resolvedCourses.length,
                term: terms.length === 1 ? { code: terms[0], name: termCodeToName(terms[0]) } : null,
                courses: resolvedCourses.map((c) => ({
                  code: c.code,
                  status: c.status,
                  sectionTypes: [...new Set(c.sections.map((s) => s.type))],
                })),
                issues: valid ? "Schedule is valid — no issues detected" : issues,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
