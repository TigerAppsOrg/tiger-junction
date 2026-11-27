import type { McpServer } from "@modelcontextprotocol/server";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { z } from "zod";
import { eq, ilike, and, asc, sql } from "drizzle-orm";
import * as schema from "../../db/schema.js";
import { readStoredGrading } from "../../oit/grading.js";
import { formatSection } from "../helpers.js";
import { resolveCourseInput } from "../resolvers.js";
import type { AuthContext } from "../context.js";
import {
  evaluateProposedSchedule,
  sectionTypePrefix,
  VERIFY_SCHEDULE_DESCRIPTION,
  verifyScheduleInputSchema,
  type ResolvedScheduleCourse,
} from "../schedule-solver.js";

interface TimeSlot {
  days: number;
  startTime: number;
  endTime: number;
}

function timeSlotsOverlap(a: TimeSlot, b: TimeSlot): boolean {
  if ((a.days & b.days) === 0) return false;
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

async function resolveAuthorizedEngineUserId(
  db: NodePgDatabase,
  authContext?: AuthContext
): Promise<{ userId?: number; error?: string }> {
  if (!authContext?.externalUserId) {
    return { error: "Missing authenticated user context. Provide x-external-user-id." };
  }

  const rows = await db
    .select({ engineUserId: schema.externalUserIdentities.engineUserId })
    .from(schema.externalUserIdentities)
    .where(
      and(
        eq(schema.externalUserIdentities.provider, "supabase"),
        eq(schema.externalUserIdentities.externalUserId, authContext.externalUserId)
      )
    )
    .limit(1);

  if (rows.length === 0) {
    return {
      error: `No identity mapping found for external user '${authContext.externalUserId}'. Complete onboarding first.`,
    };
  }

  return { userId: rows[0].engineUserId };
}

export function registerScheduleTools(
  server: McpServer,
  db: NodePgDatabase,
  authContext?: AuthContext
) {
  server.registerTool(
    "get_user_schedules",
    {
      description: "Get all schedules for a user, optionally filtered by term.",
      inputSchema: z.object({
        userId: z.number().describe("User ID"),
        term: z
          .number()
          .optional()
          .describe(
            "Term code to filter by. Mapping: 1232=Fall 2022, 1234=Spring 2023, 1242=Fall 2023, 1244=Spring 2024, 1252=Fall 2024, 1254=Spring 2025, 1262=Fall 2025, 1264=Spring 2026 (current). Codes ending in 2=Fall, ending in 4=Spring."
          ),
      }),
    },
    async ({ userId, term }) => {
      const auth = await resolveAuthorizedEngineUserId(db, authContext);
      if (!auth.userId) {
        return {
          content: [{ type: "text" as const, text: auth.error ?? "Unauthorized." }],
          isError: true,
        };
      }
      if (auth.userId !== userId) {
        return {
          content: [
            { type: "text" as const, text: "Forbidden: cannot access schedules for another user." },
          ],
          isError: true,
        };
      }

      const conditions = [eq(schema.schedules.userId, auth.userId)];
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
            text: JSON.stringify(
              { count: userSchedules.length, schedules: userSchedules },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "get_schedule_details",
    {
      description:
        "Get full details of a schedule including its courses, sections, meeting times, and any time conflicts.",
      inputSchema: z.object({
        scheduleId: z.number().describe("Schedule ID"),
      }),
    },
    async ({ scheduleId }) => {
      const auth = await resolveAuthorizedEngineUserId(db, authContext);
      if (!auth.userId) {
        return {
          content: [{ type: "text" as const, text: auth.error ?? "Unauthorized." }],
          isError: true,
        };
      }

      const schedule = await db
        .select()
        .from(schema.schedules)
        .where(eq(schema.schedules.id, scheduleId));

      if (schedule.length === 0) {
        return { content: [{ type: "text" as const, text: "Schedule not found." }], isError: true };
      }
      if (schedule[0].userId !== auth.userId) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Forbidden: schedule does not belong to authenticated user.",
            },
          ],
          isError: true,
        };
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

  server.registerTool(
    "find_courses_that_fit",
    {
      description:
        "Find courses that don't conflict with an existing schedule. Optionally filter by department or distribution area.",
      inputSchema: z.object({
        scheduleId: z.number().describe("Schedule ID to check against"),
        department: z.string().optional().describe("Department code (e.g., COS)"),
        dist: z.string().optional().describe("Distribution area (e.g., LA)"),
        limit: z.number().optional().describe("Max results to return (default 30, max 100)"),
      }),
    },
    async ({ scheduleId, department, dist, limit: maxResults }) => {
      const resultLimit = Math.min(maxResults ?? 30, 100);
      const auth = await resolveAuthorizedEngineUserId(db, authContext);
      if (!auth.userId) {
        return {
          content: [{ type: "text" as const, text: auth.error ?? "Unauthorized." }],
          isError: true,
        };
      }

      const schedule = await db
        .select()
        .from(schema.schedules)
        .where(eq(schema.schedules.id, scheduleId));

      if (schedule.length === 0) {
        return { content: [{ type: "text" as const, text: "Schedule not found." }], isError: true };
      }
      if (schedule[0].userId !== auth.userId) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Forbidden: schedule does not belong to authenticated user.",
            },
          ],
          isError: true,
        };
      }

      const existingCourseIds = await db
        .select({ courseId: schema.scheduleCourseMap.courseId })
        .from(schema.scheduleCourseMap)
        .where(eq(schema.scheduleCourseMap.scheduleId, scheduleId));

      const occupiedSlots: TimeSlot[] = [];
      for (const { courseId } of existingCourseIds) {
        const sections = await db
          .select({
            days: schema.sections.days,
            startTime: schema.sections.startTime,
            endTime: schema.sections.endTime,
          })
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

  server.registerTool(
    "verify_schedule",
    {
      description: VERIFY_SCHEDULE_DESCRIPTION,
      inputSchema: verifyScheduleInputSchema,
    },
    async (args) => {
      const issues: string[] = [];
      const requiredCourses: ResolvedScheduleCourse[] = [];
      const requiredIds = new Set<string>();

      const loadCourse = async (
        code: string,
        effectiveTerm?: number
      ): Promise<{ course?: ResolvedScheduleCourse & { id: string }; error?: string }> => {
        const resolved = await resolveCourseInput(db, { code, term: effectiveTerm });
        if (!resolved.value) {
          return { error: resolved.error ?? `Course not found: "${code}"` };
        }

        const rows = await db
          .select({
            id: schema.courses.id,
            code: schema.courses.code,
            term: schema.courses.term,
            status: schema.courses.status,
            gradingKnown: schema.courses.gradingKnown,
            examPct: schema.courses.examPct,
            psetPct: schema.courses.psetPct,
            hasFinal: schema.courses.hasFinal,
            detailsJson: schema.courses.detailsJson,
          })
          .from(schema.courses)
          .where(eq(schema.courses.id, resolved.value.id))
          .limit(1);

        const course = rows[0];
        if (!course) {
          return { error: `Course not found for resolved id: "${resolved.value.id}"` };
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

        const grading = readStoredGrading(course);

        return {
          course: {
            id: course.id,
            code: course.code,
            term: course.term,
            status: course.status,
            grading: {
              known: grading.known,
              examPct: grading.examPct,
              psetPct: grading.psetPct,
            },
            sections: sections.map((s) => ({
              title: s.title,
              type: sectionTypePrefix(s.title),
              days: s.days,
              startTime: s.startTime,
              endTime: s.endTime,
              status: s.status,
              cap: s.cap ?? 0,
              tot: s.tot ?? 0,
            })),
          },
        };
      };

      for (const code of args.courseCodes) {
        const loaded = await loadCourse(code, args.term);
        if (!loaded.course) {
          issues.push(loaded.error ?? `Course not found: "${code}"`);
          continue;
        }
        if (requiredIds.has(loaded.course.id)) {
          issues.push(`Duplicate course: ${loaded.course.code}`);
          continue;
        }
        requiredIds.add(loaded.course.id);
        requiredCourses.push(loaded.course);
      }

      const candidateCourses: ResolvedScheduleCourse[] = [];
      const unresolvedCandidateCodes: string[] = [];
      if (args.candidateCodes && args.candidateCodes.length > 0) {
        const candidateTerm =
          args.term ?? (requiredCourses.length > 0 ? requiredCourses[0].term : undefined);
        const seenCandidateIds = new Set<string>(requiredIds);
        for (const code of args.candidateCodes) {
          const loaded = await loadCourse(code, candidateTerm);
          if (!loaded.course) {
            unresolvedCandidateCodes.push(code);
            continue;
          }
          if (seenCandidateIds.has(loaded.course.id)) continue;
          seenCandidateIds.add(loaded.course.id);
          candidateCourses.push(loaded.course);
        }
      }

      const evaluation = evaluateProposedSchedule({
        requiredCourses,
        candidateCourses,
        initialIssues: issues,
        args,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                ...evaluation,
                ...(unresolvedCandidateCodes.length > 0 ? { unresolvedCandidateCodes } : {}),
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
