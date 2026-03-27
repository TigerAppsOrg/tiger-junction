// src/mcp/tools/courses.ts

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { eq, ilike, sql, asc, desc, and } from "drizzle-orm";
import * as schema from "../../db/schema.js";
import { formatSection, termCodeToName, daysToBitmask, timeToValue } from "../helpers.js";
import { buildResolutionError, resolveCourseInput } from "../resolvers.js";
import type { AuthContext } from "../context.js";

interface JunctionContext {
  supabase: SupabaseClient;
  authContext?: AuthContext;
}

export function registerCourseTools(server: McpServer, db: NodePgDatabase, junctionCtx?: JunctionContext) {
  server.tool(
    "search_courses",
    "Search for courses by department, text query, or distribution area. Returns course code, title, description, and status. Results are capped (default 50), so use the query parameter to narrow results when searching for a specific course (e.g., use query '418' instead of browsing an entire department). Use scheduleId to exclude courses that conflict with the user's existing schedule.",
    {
      term: z.number().optional().describe("Term code. Mapping: 1232=Fall 2022, 1234=Spring 2023, 1242=Fall 2023, 1244=Spring 2024, 1252=Fall 2024, 1254=Spring 2025, 1262=Fall 2025, 1264=Spring 2026 (current). Codes ending in 2=Fall, ending in 4=Spring."),
      department: z.string().optional().describe("3-letter department code (e.g., COS, AAS, ECO)"),
      query: z.string().optional().describe("Text to search in course title, description, or number. Use this to find specific courses (e.g., '418' to find COS 418)."),
      dist: z.string().optional().describe("Distribution area (e.g., LA, QCR, EM, EC, HA, SA, CD, SEL, SEN)"),
      days: z.string().optional().describe("Day filter: comma-separated day codes (M,T,W,Th,F). E.g., 'T,Th' for Tuesday/Thursday courses. Behavior depends on daysMatch."),
      daysMatch: z.enum(["exact", "includes"]).optional().describe("How to match days. 'exact' (default): ALL sections meet only on the specified days. 'includes': course has at least one section on any of the specified days."),
      startAfter: z.string().optional().describe("Earliest start time, e.g. '10:00 AM'. Excludes courses starting before this time."),
      startBefore: z.string().optional().describe("Latest start time, e.g. '2:00 PM'. Excludes courses starting after this time."),
      instructor: z.string().optional().describe("Instructor name (partial match, e.g. 'Dondero'). Filters to courses taught by this instructor."),
      scheduleId: z.number().optional().describe("TigerJunction schedule ID. When provided, excludes courses that conflict with the schedule's existing courses. Requires authenticated user (junction scope)."),
      limit: z.number().optional().describe("Max results to return (default 50, max 200)"),
      offset: z.number().optional().describe("Number of results to skip for pagination (default 0)"),
    },
    async ({ term, department, query, dist, days, daysMatch, startAfter, startBefore, instructor, scheduleId, limit: maxResults, offset }) => {
      const resultLimit = Math.min(maxResults ?? 50, 200);
      const resultOffset = offset ?? 0;
      const conditions = [];

      if (term) conditions.push(eq(schema.courses.term, term));
      if (department) conditions.push(ilike(schema.courses.code, `${department}%`));
      if (query) {
        conditions.push(
          sql`(${schema.courses.code} ILIKE ${"%" + query + "%"} OR ${schema.courses.title} ILIKE ${"%" + query + "%"} OR ${schema.courses.description} ILIKE ${"%" + query + "%"})`
        );
      }
      if (dist) conditions.push(sql`${dist} = ANY(${schema.courses.dists})`);
      if (days) {
        const mask = daysToBitmask(days.split(",").map((d) => d.trim()));
        if (daysMatch === "includes") {
          // Fuzzy: course has at least one section on any of the specified days
          conditions.push(
            sql`${schema.courses.id} IN (SELECT DISTINCT ${schema.sections.courseId} FROM ${schema.sections} WHERE (${schema.sections.days} & ${mask}) != 0)`
          );
        } else {
          // Exact (default): ALL sections meet only on the specified days
          conditions.push(
            sql`${schema.courses.id} NOT IN (SELECT DISTINCT ${schema.sections.courseId} FROM ${schema.sections} WHERE (${schema.sections.days} & ${~mask & 31}) != 0)`
          );
          conditions.push(
            sql`${schema.courses.id} IN (SELECT DISTINCT ${schema.sections.courseId} FROM ${schema.sections} WHERE ${schema.sections.days} != 0)`
          );
        }
      }
      if (startAfter) {
        const val = timeToValue(startAfter);
        conditions.push(
          sql`${schema.courses.id} NOT IN (SELECT DISTINCT ${schema.sections.courseId} FROM ${schema.sections} WHERE ${schema.sections.startTime} < ${val} AND ${schema.sections.startTime} != -420)`
        );
      }
      if (startBefore) {
        const val = timeToValue(startBefore);
        conditions.push(
          sql`${schema.courses.id} NOT IN (SELECT DISTINCT ${schema.sections.courseId} FROM ${schema.sections} WHERE ${schema.sections.startTime} > ${val} AND ${schema.sections.startTime} != -420)`
        );
      }
      if (instructor) {
        conditions.push(
          sql`${schema.courses.id} IN (SELECT ${schema.courseInstructorMap.courseId} FROM ${schema.courseInstructorMap} INNER JOIN ${schema.instructors} ON ${schema.courseInstructorMap.instructorId} = ${schema.instructors.netid} WHERE ${schema.instructors.fullName} ILIKE ${"%" + instructor + "%"})`
        );
      }

      // Fetch more results when schedule filtering is active (some will be filtered out)
      const fetchLimit = scheduleId ? resultLimit * 3 : resultLimit;

      const courses = await db
        .select({
          id: schema.courses.id,
          listingId: schema.courses.listingId,
          term: schema.courses.term,
          code: schema.courses.code,
          title: schema.courses.title,
          description: schema.courses.description,
          status: schema.courses.status,
          dists: schema.courses.dists,
          hasFinal: schema.courses.hasFinal,
        })
        .from(schema.courses)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(schema.courses.code))
        .offset(resultOffset)
        .limit(fetchLimit);

      // If scheduleId is provided and junction context available, post-filter for conflicts
      if (scheduleId != null && junctionCtx) {
        const { supabase, authContext } = junctionCtx;

        // Resolve user
        if (!authContext?.netid) {
          return {
            content: [{ type: "text" as const, text: "scheduleId filter requires authenticated user (x-user-netid header)." }],
            isError: true,
          };
        }

        const { data: userId } = await supabase.rpc("get_user_id_by_netid", { netid: authContext.netid });
        if (!userId) {
          return {
            content: [{ type: "text" as const, text: `No TigerJunction account found for NetID '${authContext.netid}'.` }],
            isError: true,
          };
        }

        // Verify schedule ownership
        const { data: sched } = await supabase
          .from("schedules")
          .select("id, user_id")
          .eq("id", scheduleId)
          .single();

        if (!sched || sched.user_id !== userId) {
          return {
            content: [{ type: "text" as const, text: "Schedule not found or does not belong to authenticated user." }],
            isError: true,
          };
        }

        // Get existing courses in schedule
        const { data: existingAssocs } = await supabase
          .from("course_schedule_associations")
          .select("course_id")
          .eq("schedule_id", scheduleId);

        const existingCourseIds = new Set((existingAssocs ?? []).map((a: { course_id: number }) => a.course_id));

        // Get occupied time slots from schedule's sections (via engine DB for consistency)
        const occupiedSlots: { days: number; startTime: number; endTime: number }[] = [];
        if (existingCourseIds.size > 0) {
          // Map Supabase course IDs to engine course IDs via listing_id + term
          const { data: supabaseCourses } = await supabase
            .from("courses")
            .select("listing_id, term")
            .in("id", [...existingCourseIds]);

          for (const sc of supabaseCourses ?? []) {
            const engineCourseId = `${sc.listing_id}-${sc.term}`;
            const sections = await db
              .select({ days: schema.sections.days, startTime: schema.sections.startTime, endTime: schema.sections.endTime })
              .from(schema.sections)
              .where(eq(schema.sections.courseId, engineCourseId));
            occupiedSlots.push(...sections);
          }
        }

        // Filter out courses already in schedule and courses that conflict
        const filtered = [];
        for (const course of courses) {
          // Skip courses already in schedule (match by listing_id + term)
          const sections = await db
            .select({
              title: schema.sections.title,
              days: schema.sections.days,
              startTime: schema.sections.startTime,
              endTime: schema.sections.endTime,
            })
            .from(schema.sections)
            .where(eq(schema.sections.courseId, course.id));

          if (sections.length === 0) { filtered.push(course); continue; }

          // Group by section type
          const byType = new Map<string, typeof sections>();
          for (const s of sections) {
            const type = s.title.match(/^([A-Z]+)/)?.[1] ?? s.title;
            if (!byType.has(type)) byType.set(type, []);
            byType.get(type)!.push(s);
          }

          // Course fits if each section type has at least one non-conflicting option
          const fits = [...byType.values()].every((group) =>
            group.some((s) =>
              !occupiedSlots.some((o) =>
                (s.days & o.days) !== 0 && s.startTime < o.endTime && o.startTime < s.endTime
              )
            )
          );

          if (fits) filtered.push(course);
          if (filtered.length >= resultLimit) break;
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ count: filtered.length, scheduleFiltered: true, scheduleId, courses: filtered }, null, 2),
            },
          ],
        };
      }

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
    "Get full details for a specific course including description, grading basis, distribution areas, and whether it has a final exam. Provide EITHER courseId OR code, not both.",
    {
      courseId: z.string().optional().describe("Course ID: listingId + term code (e.g., '002051-1264' where 1264=Spring 2026). Term codes: ending in 2=Fall, ending in 4=Spring. 1232=Fall 2022, 1234=Spring 2023, 1242=Fall 2023, 1244=Spring 2024, 1252=Fall 2024, 1254=Spring 2025, 1262=Fall 2025, 1264=Spring 2026 (current)."),
      code: z.string().optional().describe("Course code (e.g., 'COS 226'). Preferred over courseId when both are provided."),
      term: z.number().optional().describe("Term code to disambiguate when searching by code. If omitted, returns the most recent term's offering."),
    },
    async ({ courseId, code, term }) => {
      const resolved = await resolveCourseInput(db, { courseId, code, term });
      if (!resolved.value) return buildResolutionError(resolved.error ?? "Course not found.", resolved.options);

      const rows = await db.select().from(schema.courses).where(eq(schema.courses.id, resolved.value.id)).limit(1);
      const course = rows[0];
      if (!course) return buildResolutionError("Course not found.");

      const instructors = await db
        .select({ netid: schema.instructors.netid, name: schema.instructors.name })
        .from(schema.courseInstructorMap)
        .innerJoin(schema.instructors, eq(schema.courseInstructorMap.instructorId, schema.instructors.netid))
        .where(eq(schema.courseInstructorMap.courseId, course.id));

      const sections = await db
        .select({
          title: schema.sections.title,
          days: schema.sections.days,
          startTime: schema.sections.startTime,
          endTime: schema.sections.endTime,
        })
        .from(schema.sections)
        .where(eq(schema.sections.courseId, course.id))
        .orderBy(asc(schema.sections.id));

      const meetingTimes = sections.map(formatSection);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                courseId: course.id,
                listingId: course.listingId,
                term: course.term,
                ...course,
                instructors,
                meetingTimes,
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
    "get_course_sections",
    "Get all sections for a course including meeting times, rooms, enrollment, and capacity. Provide EITHER courseId OR code, not both.",
    {
      courseId: z.string().optional().describe("Course ID: listingId + term code (e.g., '002051-1264' where 1264=Spring 2026). Term codes: ending in 2=Fall, ending in 4=Spring. 1232=Fall 2022, 1234=Spring 2023, 1242=Fall 2023, 1244=Spring 2024, 1252=Fall 2024, 1254=Spring 2025, 1262=Fall 2025, 1264=Spring 2026 (current)."),
      code: z.string().optional().describe("Course code (e.g., 'COS 226'). Preferred over courseId when both are provided."),
      term: z.number().optional().describe("Term code to disambiguate when searching by code. If omitted, returns the most recent term's offering."),
    },
    async ({ courseId, code, term }) => {
      const resolved = await resolveCourseInput(db, { courseId, code, term });
      if (!resolved.value) return buildResolutionError(resolved.error ?? "Course not found.", resolved.options);

      const sections = await db
        .select()
        .from(schema.sections)
        .where(eq(schema.sections.courseId, resolved.value.id))
        .orderBy(asc(schema.sections.id));

      const formatted = sections.map(formatSection);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                courseId: resolved.value.id,
                listingId: resolved.value.listingId,
                term: resolved.value.term,
                code: resolved.value.code,
                count: formatted.length,
                sections: formatted,
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
      term: z.number().optional().describe("Term code to limit results to a specific semester (e.g., 1264 for Spring 2026)."),
      department: z.string().optional().describe("Limit to a department (e.g., COS)"),
      limit: z.number().optional().describe("Max results (default 25)"),
    },
    async ({ filter, term, department, limit: maxResults }) => {
      const resultLimit = maxResults ?? 25;
      const conditions = [];

      if (term) conditions.push(eq(schema.courses.term, term));
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

  server.tool(
    "list_terms",
    "List all academic terms available in the database with their human-readable names.",
    {},
    async () => {
      const terms = await db
        .select({ term: schema.courses.term })
        .from(schema.courses)
        .groupBy(schema.courses.term)
        .orderBy(asc(schema.courses.term));

      const termList = terms.map((t) => ({
        term: t.term,
        name: termCodeToName(t.term),
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ count: termList.length, terms: termList }, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "compare_courses",
    "Compare 2-5 courses side by side. Returns details, instructors, meeting times, ratings, and enrollment for each.",
    {
      codes: z.array(z.string()).min(2).max(5).describe("Array of course codes to compare (e.g., ['COS 226', 'COS 217'])"),
      term: z.number().optional().describe("Term code. If omitted, uses the most recent term each course was offered."),
    },
    async ({ codes, term }) => {
      const comparisons = await Promise.all(
        codes.map(async (code) => {
          const resolved = await resolveCourseInput(db, { code, term });
          if (!resolved.value) {
            return {
              code,
              error: resolved.error ?? "Course not found",
              options: resolved.options ?? [],
            };
          }

          const rows = await db.select().from(schema.courses).where(eq(schema.courses.id, resolved.value.id)).limit(1);
          const course = rows[0];
          if (!course) return { code, error: "Course not found" };

          const instructors = await db
            .select({ netid: schema.instructors.netid, name: schema.instructors.name })
            .from(schema.courseInstructorMap)
            .innerJoin(schema.instructors, eq(schema.courseInstructorMap.instructorId, schema.instructors.netid))
            .where(eq(schema.courseInstructorMap.courseId, course.id));

          const sections = await db
            .select()
            .from(schema.sections)
            .where(eq(schema.sections.courseId, course.id))
            .orderBy(asc(schema.sections.id));

          const totalEnrolled = sections.reduce((sum, s) => sum + (s.tot ?? 0), 0);
          const totalCapacity = sections.reduce((sum, s) => sum + (s.cap ?? 0), 0);

          const evals = await db
            .select({ rating: schema.evaluations.rating, evalTerm: schema.evaluations.evalTerm })
            .from(schema.evaluations)
            .where(eq(schema.evaluations.listingId, course.listingId))
            .orderBy(desc(schema.evaluations.evalTerm))
            .limit(1);

          return {
            code: course.code,
            title: course.title,
            term: course.term,
            termName: termCodeToName(course.term),
            description: course.description,
            dists: course.dists,
            gradingBasis: course.gradingBasis,
            hasFinal: course.hasFinal,
            instructors,
            meetingTimes: sections.map(formatSection),
            enrollment: { enrolled: totalEnrolled, capacity: totalCapacity, percentFull: totalCapacity > 0 ? `${Math.round((totalEnrolled / totalCapacity) * 100)}%` : "N/A" },
            latestRating: evals[0]?.rating ?? null,
          };
        })
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ count: comparisons.length, courses: comparisons }, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "get_enrollment_stats",
    "Get enrollment statistics for a course: per-section enrolled/capacity breakdown and overall percentage full.",
    {
      courseId: z.string().optional().describe("Course ID (e.g., '002051-1264')"),
      code: z.string().optional().describe("Course code (e.g., 'COS 226'). Preferred over courseId when both are provided."),
      term: z.number().optional().describe("Term code to disambiguate when searching by code."),
    },
    async ({ courseId, code, term }) => {
      const resolved = await resolveCourseInput(db, { courseId, code, term });
      if (!resolved.value) return buildResolutionError(resolved.error ?? "Course not found.", resolved.options);

      const sections = await db
        .select({
          title: schema.sections.title,
          tot: schema.sections.tot,
          cap: schema.sections.cap,
          status: schema.sections.status,
        })
        .from(schema.sections)
        .where(eq(schema.sections.courseId, resolved.value.id))
        .orderBy(asc(schema.sections.id));

      const totalEnrolled = sections.reduce((sum, s) => sum + (s.tot ?? 0), 0);
      const totalCapacity = sections.reduce((sum, s) => sum + (s.cap ?? 0), 0);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                courseId: resolved.value.id,
                listingId: resolved.value.listingId,
                term: resolved.value.term,
                code: resolved.value.code,
                totalEnrolled,
                totalCapacity,
                percentFull: totalCapacity > 0 ? `${Math.round((totalEnrolled / totalCapacity) * 100)}%` : "N/A",
                sections: sections.map((s) => ({
                  title: s.title,
                  enrolled: s.tot,
                  capacity: s.cap,
                  status: s.status,
                })),
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
