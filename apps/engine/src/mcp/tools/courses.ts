import type { McpServer } from "@modelcontextprotocol/server";

// src/mcp/tools/courses.ts
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { eq, ilike, sql, asc, desc, and, lte, gte, inArray } from "drizzle-orm";
import * as schema from "../../db/schema.js";
import { formatSection, termCodeToName, daysToBitmask, timeToValue } from "../helpers.js";
import { buildResolutionError, resolveCourseInput } from "../resolvers.js";
import { readStoredDetailsMetadata, readStoredGrading } from "../../oit/grading.js";
import type { AuthContext } from "../context.js";

/**
 * Calculate true enrollment by grouping sections by type.
 * Each student enrolls in one section per type (one lecture, one precept, etc.).
 * The true enrollment is the sum within the type with the highest total
 * (typically Lecture, which all students share).
 */
function calculateEnrollment(
  sections: { title: string; tot: number | null; cap: number | null }[]
): {
  enrolled: number;
  capacity: number;
} {
  // Group by section type prefix (L=Lecture, P=Precept, C=Class, S=Seminar, etc.)
  const byType = new Map<string, { enrolled: number; capacity: number }>();
  for (const s of sections) {
    const typeMatch = s.title.match(/^([A-Z]+)/);
    const type = typeMatch ? typeMatch[1] : s.title;
    const entry = byType.get(type) ?? { enrolled: 0, capacity: 0 };
    entry.enrolled += s.tot ?? 0;
    entry.capacity += s.cap ?? 0;
    byType.set(type, entry);
  }

  if (byType.size === 0) return { enrolled: 0, capacity: 0 };

  // Pick the type with the highest total enrollment — that's the true student count
  // (Lecture sections contain all students; precepts split them into smaller groups)
  let best = { enrolled: 0, capacity: 0 };
  for (const entry of byType.values()) {
    if (entry.enrolled > best.enrolled) best = entry;
  }

  return best;
}

interface JunctionContext {
  supabase: SupabaseClient;
  authContext?: AuthContext;
}

export function registerCourseTools(
  server: McpServer,
  db: NodePgDatabase,
  junctionCtx?: JunctionContext
) {
  server.registerTool(
    "search_courses",
    {
      description:
        "Search for courses by department, text query, distribution area, meeting times, instructor, grading mix (exam/pset weights), evaluation rating, or review keyword. Returns decision cards including grading breakdown (unknown stays unknown and is never treated as 0% exams), latest rating, course website, and restrictions. Results are capped (default 50). Use scheduleId to exclude courses that conflict with the user's existing schedule.",
      inputSchema: z.object({
        term: z
          .number()
          .optional()
          .describe(
            "Term code. Mapping: 1232=Fall 2022, 1234=Spring 2023, 1242=Fall 2023, 1244=Spring 2024, 1252=Fall 2024, 1254=Spring 2025, 1262=Fall 2025, 1264=Spring 2026, 1272=Fall 2026 (current), 1274=Spring 2027 (upcoming; use for searches unless the user specifies another term). Codes ending in 2=Fall, ending in 4=Spring."
          ),
        department: z
          .string()
          .optional()
          .describe("3-letter department code (e.g., COS, AAS, ECO)"),
        query: z
          .string()
          .optional()
          .describe(
            "Text to search in course title, description, or number. Use this to find specific courses (e.g., '418' to find COS 418)."
          ),
        dist: z
          .string()
          .optional()
          .describe("Distribution area (e.g., LA, QCR, EM, EC, HA, SA, CD, SEL, SEN)"),
        days: z
          .string()
          .optional()
          .describe(
            "Day filter: comma-separated day codes (M,T,W,Th,F). E.g., 'T,Th' for Tuesday/Thursday courses. Behavior depends on daysMatch."
          ),
        daysMatch: z
          .enum(["exact", "includes"])
          .optional()
          .describe(
            "How to match days. 'exact' (default): ALL sections meet only on the specified days. 'includes': course has at least one section on any of the specified days."
          ),
        startAfter: z
          .string()
          .optional()
          .describe(
            "Earliest start time, e.g. '10:00 AM'. Excludes courses starting before this time."
          ),
        startBefore: z
          .string()
          .optional()
          .describe(
            "Latest start time, e.g. '2:00 PM'. Excludes courses starting after this time."
          ),
        instructor: z
          .string()
          .optional()
          .describe(
            "Instructor name (partial match, e.g. 'Dondero'). Filters to courses taught by this instructor."
          ),
        maxExamPct: z
          .number()
          .min(0)
          .max(100)
          .optional()
          .describe(
            "Maximum combined exam + quiz percentage (0-100). Matches ONLY courses with confirmed grading metadata (gradingKnown=true); unknown grading is excluded so missing data never matches 0% exams."
          ),
        minPsetPct: z
          .number()
          .min(0)
          .max(100)
          .optional()
          .describe(
            "Minimum combined problem set + programming assignment percentage (0-100). Matches ONLY courses with confirmed grading metadata."
          ),
        excludeUnknownGrading: z
          .boolean()
          .optional()
          .describe("When true, returns only courses with confirmed OIT grading percentages."),
        minRating: z
          .number()
          .min(1)
          .max(5)
          .optional()
          .describe("Minimum latest historical evaluation rating (1.0-5.0)."),
        reviewKeyword: z
          .string()
          .optional()
          .describe(
            "Case-insensitive keyword to match in historical student evaluation comments or summaries (e.g., 'midterm', 'take-home', 'pset')."
          ),
        scheduleId: z
          .number()
          .optional()
          .describe(
            "TigerJunction schedule ID. When provided, excludes courses that conflict with the schedule's existing courses. Requires authenticated user (junction scope)."
          ),
        limit: z.number().optional().describe("Max results to return (default 50, max 200)"),
        offset: z
          .number()
          .optional()
          .describe("Number of results to skip for pagination (default 0)"),
      }),
    },
    async ({
      term,
      department,
      query,
      dist,
      days,
      daysMatch,
      startAfter,
      startBefore,
      instructor,
      maxExamPct,
      minPsetPct,
      excludeUnknownGrading,
      minRating,
      reviewKeyword,
      scheduleId,
      limit: maxResults,
      offset,
    }) => {
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
      if (excludeUnknownGrading || maxExamPct != null || minPsetPct != null) {
        conditions.push(eq(schema.courses.gradingKnown, true));
      }
      if (maxExamPct != null) {
        conditions.push(lte(schema.courses.examPct, Math.floor(maxExamPct)));
      }
      if (minPsetPct != null) {
        conditions.push(gte(schema.courses.psetPct, Math.ceil(minPsetPct)));
      }
      if (minRating != null) {
        conditions.push(
          sql`${schema.courses.listingId} IN (
            SELECT DISTINCT ON (${schema.evaluations.listingId}) ${schema.evaluations.listingId}
            FROM ${schema.evaluations}
            WHERE ${schema.evaluations.rating} IS NOT NULL
            ORDER BY ${schema.evaluations.listingId}, ${schema.evaluations.evalTerm} DESC
          )`
        );
        conditions.push(
          sql`(
            SELECT ${schema.evaluations.rating}
            FROM ${schema.evaluations}
            WHERE ${schema.evaluations.listingId} = ${schema.courses.listingId}
              AND ${schema.evaluations.rating} IS NOT NULL
            ORDER BY ${schema.evaluations.evalTerm} DESC
            LIMIT 1
          ) >= ${minRating}`
        );
      }
      if (reviewKeyword && reviewKeyword.trim().length > 0) {
        const pattern = `%${reviewKeyword.trim()}%`;
        conditions.push(
          sql`${schema.courses.listingId} IN (
            SELECT DISTINCT ${schema.evaluations.listingId}
            FROM ${schema.evaluations}
            WHERE ${schema.evaluations.summary} ILIKE ${pattern}
               OR array_to_string(${schema.evaluations.comments}, ' ') ILIKE ${pattern}
          )`
        );
      }

      // Fetch more results when schedule filtering is active (some will be filtered out)
      const fetchLimit = scheduleId ? resultLimit * 3 : resultLimit;

      const rawCourses = await db
        .select({
          id: schema.courses.id,
          listingId: schema.courses.listingId,
          term: schema.courses.term,
          code: schema.courses.code,
          title: schema.courses.title,
          description: schema.courses.description,
          status: schema.courses.status,
          dists: schema.courses.dists,
          gradingBasis: schema.courses.gradingBasis,
          hasFinal: schema.courses.hasFinal,
          examPct: schema.courses.examPct,
          psetPct: schema.courses.psetPct,
          gradingKnown: schema.courses.gradingKnown,
          webAddress: schema.courses.webAddress,
          restrictions: schema.courses.restrictions,
          detailsJson: schema.courses.detailsJson,
          detailsFetchedAt: schema.courses.detailsFetchedAt,
        })
        .from(schema.courses)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(schema.courses.code))
        .offset(resultOffset)
        .limit(fetchLimit);

      // Attach latest evaluation rating in a single batched query
      const latestRatings = new Map<string, { rating: number | null; evalTerm: string | null }>();
      const listingIds = [...new Set(rawCourses.map((c) => c.listingId))];
      if (listingIds.length > 0) {
        const evalRows = await db
          .select({
            listingId: schema.evaluations.listingId,
            evalTerm: schema.evaluations.evalTerm,
            rating: schema.evaluations.rating,
          })
          .from(schema.evaluations)
          .where(inArray(schema.evaluations.listingId, listingIds))
          .orderBy(desc(schema.evaluations.evalTerm));

        for (const ev of evalRows) {
          if (!latestRatings.has(ev.listingId) && ev.rating != null) {
            latestRatings.set(ev.listingId, { rating: ev.rating, evalTerm: ev.evalTerm });
          }
        }
      }

      const formatCard = (course: (typeof rawCourses)[number]) => {
        const grading = readStoredGrading(course);
        const ratingInfo = latestRatings.get(course.listingId);
        return {
          id: course.id,
          listingId: course.listingId,
          term: course.term,
          code: course.code,
          title: course.title,
          description: course.description,
          status: course.status,
          dists: course.dists,
          gradingBasis: course.gradingBasis,
          hasFinal: course.hasFinal,
          grading: {
            known: grading.known,
            examPct: grading.examPct,
            psetPct: grading.psetPct,
            totalPct: grading.totalPct,
            hasAnyExam: grading.hasAnyExam,
            breakdown: grading.breakdown.map((b) => ({
              label: b.label,
              category: b.category,
              percent: b.percent,
            })),
          },
          webAddress: course.webAddress ?? null,
          restrictions: course.restrictions ?? null,
          latestRating: ratingInfo?.rating ?? null,
          latestRatingTerm: ratingInfo?.evalTerm ?? null,
          detailsFetchedAt: course.detailsFetchedAt
            ? new Date(course.detailsFetchedAt).toISOString()
            : null,
        };
      };

      const courses = rawCourses.map(formatCard);

      // If scheduleId is provided and junction context available, post-filter for conflicts
      if (scheduleId != null && junctionCtx) {
        const { supabase, authContext } = junctionCtx;

        // Resolve user
        if (!authContext?.netid) {
          return {
            content: [
              {
                type: "text" as const,
                text: "scheduleId filter requires authenticated user (x-user-netid header).",
              },
            ],
            isError: true,
          };
        }

        const { data: userId } = await supabase.rpc("get_user_id_by_netid", {
          netid: authContext.netid,
        });
        if (!userId) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No TigerJunction account found for NetID '${authContext.netid}'.`,
              },
            ],
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
            content: [
              {
                type: "text" as const,
                text: "Schedule not found or does not belong to authenticated user.",
              },
            ],
            isError: true,
          };
        }

        // Get existing courses in schedule
        const { data: existingAssocs } = await supabase
          .from("course_schedule_associations")
          .select("course_id")
          .eq("schedule_id", scheduleId);

        const existingCourseIds = new Set(
          (existingAssocs ?? []).map((a: { course_id: number }) => a.course_id)
        );

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
              .select({
                days: schema.sections.days,
                startTime: schema.sections.startTime,
                endTime: schema.sections.endTime,
              })
              .from(schema.sections)
              .where(eq(schema.sections.courseId, engineCourseId));
            occupiedSlots.push(...sections);
          }
        }

        // Filter out courses already in schedule and courses that conflict
        const filtered = [];
        for (const course of courses) {
          const sections = await db
            .select({
              title: schema.sections.title,
              days: schema.sections.days,
              startTime: schema.sections.startTime,
              endTime: schema.sections.endTime,
            })
            .from(schema.sections)
            .where(eq(schema.sections.courseId, course.id));

          if (sections.length === 0) {
            filtered.push(course);
            continue;
          }

          // Group by section type
          const byType = new Map<string, typeof sections>();
          for (const s of sections) {
            const type = s.title.match(/^([A-Z]+)/)?.[1] ?? s.title;
            if (!byType.has(type)) byType.set(type, []);
            byType.get(type)!.push(s);
          }

          // Course fits if each section type has at least one non-conflicting option
          const fits = [...byType.values()].every((group) =>
            group.some(
              (s) =>
                !occupiedSlots.some(
                  (o) =>
                    (s.days & o.days) !== 0 && s.startTime < o.endTime && o.startTime < s.endTime
                )
            )
          );

          if (fits) filtered.push(course);
          if (filtered.length >= resultLimit) break;
        }

        const gradingKnownCount = filtered.filter((c) => c.grading.known).length;

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  count: filtered.length,
                  scheduleFiltered: true,
                  scheduleId,
                  coverage: {
                    gradingKnownCount,
                    gradingUnknownCount: filtered.length - gradingKnownCount,
                  },
                  courses: filtered,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const gradingKnownCount = courses.filter((c) => c.grading.known).length;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: courses.length,
                coverage: {
                  gradingKnownCount,
                  gradingUnknownCount: courses.length - gradingKnownCount,
                },
                courses,
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
    "get_course_details",
    {
      description:
        "Get full details for a specific course including description, full OIT grading breakdown (exam/pset/paper/project percentages; unknown stays unknown), course website/syllabus link, prerequisites/restrictions text, reading list, distribution areas, instructors, and meeting times. Provide EITHER courseId OR code, not both.",
      inputSchema: z.object({
        courseId: z
          .string()
          .optional()
          .describe(
            "Course ID: listingId + term code (e.g., '002051-1264' where 1264=Spring 2026). Term codes: ending in 2=Fall, ending in 4=Spring. 1232=Fall 2022, 1234=Spring 2023, 1242=Fall 2023, 1244=Spring 2024, 1252=Fall 2024, 1254=Spring 2025, 1262=Fall 2025, 1264=Spring 2026, 1272=Fall 2026 (current), 1274=Spring 2027 (upcoming; use for searches unless the user specifies another term)."
          ),
        code: z
          .string()
          .optional()
          .describe(
            "Course code (e.g., 'COS 226'). Preferred over courseId when both are provided."
          ),
        term: z
          .number()
          .optional()
          .describe(
            "Term code to disambiguate when searching by code. If omitted, returns the most recent term's offering."
          ),
      }),
    },
    async ({ courseId, code, term }) => {
      const resolved = await resolveCourseInput(db, { courseId, code, term });
      if (!resolved.value)
        return buildResolutionError(resolved.error ?? "Course not found.", resolved.options);

      const rows = await db
        .select()
        .from(schema.courses)
        .where(eq(schema.courses.id, resolved.value.id))
        .limit(1);
      const course = rows[0];
      if (!course) return buildResolutionError("Course not found.");

      const instructors = await db
        .select({ netid: schema.instructors.netid, name: schema.instructors.name })
        .from(schema.courseInstructorMap)
        .innerJoin(
          schema.instructors,
          eq(schema.courseInstructorMap.instructorId, schema.instructors.netid)
        )
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
      const grading = readStoredGrading(course);
      const metadata = readStoredDetailsMetadata(course.detailsJson);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                courseId: course.id,
                listingId: course.listingId,
                term: course.term,
                code: course.code,
                title: course.title,
                description: course.description,
                status: course.status,
                dists: course.dists,
                gradingBasis: course.gradingBasis,
                hasFinal: course.hasFinal,
                grading,
                webAddress: course.webAddress ?? metadata?.webAddress ?? null,
                restrictions: course.restrictions ?? metadata?.otherRestrictions ?? null,
                otherRequirements: metadata?.otherRequirements ?? null,
                otherInformation: metadata?.otherInformation ?? null,
                readingWritingAssignment: metadata?.readingWritingAssignment ?? null,
                addConsent: metadata?.addConsent ?? null,
                dropConsent: metadata?.dropConsent ?? null,
                readingList: metadata?.readingList ?? [],
                seatReservations: metadata?.seatReservations ?? [],
                detailsFetchedAt: course.detailsFetchedAt
                  ? new Date(course.detailsFetchedAt).toISOString()
                  : (metadata?.fetchedAt ?? null),
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

  server.registerTool(
    "get_course_sections",
    {
      description:
        "Get all sections for a course including meeting times, rooms, enrollment, and capacity. Provide EITHER courseId OR code, not both.",
      inputSchema: z.object({
        courseId: z
          .string()
          .optional()
          .describe(
            "Course ID: listingId + term code (e.g., '002051-1264' where 1264=Spring 2026). Term codes: ending in 2=Fall, ending in 4=Spring. 1232=Fall 2022, 1234=Spring 2023, 1242=Fall 2023, 1244=Spring 2024, 1252=Fall 2024, 1254=Spring 2025, 1262=Fall 2025, 1264=Spring 2026, 1272=Fall 2026 (current), 1274=Spring 2027 (upcoming; use for searches unless the user specifies another term)."
          ),
        code: z
          .string()
          .optional()
          .describe(
            "Course code (e.g., 'COS 226'). Preferred over courseId when both are provided."
          ),
        term: z
          .number()
          .optional()
          .describe(
            "Term code to disambiguate when searching by code. If omitted, returns the most recent term's offering."
          ),
      }),
    },
    async ({ courseId, code, term }) => {
      const resolved = await resolveCourseInput(db, { courseId, code, term });
      if (!resolved.value)
        return buildResolutionError(resolved.error ?? "Course not found.", resolved.options);

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

  server.registerTool(
    "list_departments",
    { description: "List all academic departments with their codes.", inputSchema: z.object({}) },
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

  server.registerTool(
    "discover_courses",
    {
      description:
        "Discover interesting courses by filter: 'new' (first-time offerings), 'small_seminar' (low enrollment cap), 'no_final' (no seated final exam), 'no_exams' (confirmed 0% exams/quizzes), 'pset_heavy' (confirmed >=60% problem sets/programming), 'open' (has open sections).",
      inputSchema: z.object({
        filter: z
          .enum(["new", "small_seminar", "no_final", "no_exams", "pset_heavy", "open"])
          .describe("Discovery filter to apply"),
        term: z
          .number()
          .optional()
          .describe(
            "Term code to limit results to a specific semester (e.g., 1274 for Spring 2027)."
          ),
        department: z.string().optional().describe("Limit to a department (e.g., COS)"),
        limit: z.number().optional().describe("Max results (default 25)"),
      }),
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
      } else if (filter === "no_exams") {
        conditions.push(eq(schema.courses.gradingKnown, true));
        conditions.push(eq(schema.courses.examPct, 0));
      } else if (filter === "pset_heavy") {
        conditions.push(eq(schema.courses.gradingKnown, true));
        conditions.push(gte(schema.courses.psetPct, 60));
      }

      if (filter === "small_seminar" || filter === "open") {
        const subquery =
          filter === "small_seminar"
            ? sql`SELECT DISTINCT ${schema.sections.courseId} FROM ${schema.sections} WHERE ${schema.sections.cap} <= 20`
            : sql`SELECT DISTINCT ${schema.sections.courseId} FROM ${schema.sections} WHERE ${schema.sections.status} = 'open'`;

        conditions.push(sql`${schema.courses.id} IN (${subquery})`);
      }

      const rawCourses = await db
        .select({
          id: schema.courses.id,
          code: schema.courses.code,
          title: schema.courses.title,
          status: schema.courses.status,
          dists: schema.courses.dists,
          hasFinal: schema.courses.hasFinal,
          examPct: schema.courses.examPct,
          psetPct: schema.courses.psetPct,
          gradingKnown: schema.courses.gradingKnown,
          detailsJson: schema.courses.detailsJson,
        })
        .from(schema.courses)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(schema.courses.code))
        .limit(resultLimit);

      const courses = rawCourses.map((c) => ({
        id: c.id,
        code: c.code,
        title: c.title,
        status: c.status,
        dists: c.dists,
        hasFinal: c.hasFinal,
        grading: readStoredGrading(c),
      }));

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

  server.registerTool(
    "list_terms",
    {
      description:
        "List all academic terms available in the database with their human-readable names.",
      inputSchema: z.object({}),
    },
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

  server.registerTool(
    "compare_courses",
    {
      description:
        "Compare 2-5 courses side by side. Returns details, grading breakdown, restrictions, course website, instructors, meeting times, ratings, and enrollment for each.",
      inputSchema: z.object({
        codes: z
          .array(z.string())
          .min(2)
          .max(5)
          .describe("Array of course codes to compare (e.g., ['COS 226', 'COS 217'])"),
        term: z
          .number()
          .optional()
          .describe("Term code. If omitted, uses the most recent term each course was offered."),
      }),
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

          const rows = await db
            .select()
            .from(schema.courses)
            .where(eq(schema.courses.id, resolved.value.id))
            .limit(1);
          const course = rows[0];
          if (!course) return { code, error: "Course not found" };

          const instructors = await db
            .select({ netid: schema.instructors.netid, name: schema.instructors.name })
            .from(schema.courseInstructorMap)
            .innerJoin(
              schema.instructors,
              eq(schema.courseInstructorMap.instructorId, schema.instructors.netid)
            )
            .where(eq(schema.courseInstructorMap.courseId, course.id));

          const sections = await db
            .select()
            .from(schema.sections)
            .where(eq(schema.sections.courseId, course.id))
            .orderBy(asc(schema.sections.id));

          const { enrolled: totalEnrolled, capacity: totalCapacity } =
            calculateEnrollment(sections);

          const evals = await db
            .select({ rating: schema.evaluations.rating, evalTerm: schema.evaluations.evalTerm })
            .from(schema.evaluations)
            .where(eq(schema.evaluations.listingId, course.listingId))
            .orderBy(desc(schema.evaluations.evalTerm))
            .limit(1);

          const grading = readStoredGrading(course);

          return {
            code: course.code,
            title: course.title,
            term: course.term,
            termName: termCodeToName(course.term),
            description: course.description,
            dists: course.dists,
            gradingBasis: course.gradingBasis,
            hasFinal: course.hasFinal,
            grading,
            webAddress: course.webAddress ?? null,
            restrictions: course.restrictions ?? null,
            instructors,
            meetingTimes: sections.map(formatSection),
            enrollment: {
              enrolled: totalEnrolled,
              capacity: totalCapacity,
              percentFull:
                totalCapacity > 0 ? `${Math.round((totalEnrolled / totalCapacity) * 100)}%` : "N/A",
            },
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

  server.registerTool(
    "get_enrollment_stats",
    {
      description:
        "Get enrollment statistics for a course: per-section enrolled/capacity breakdown and overall percentage full.",
      inputSchema: z.object({
        courseId: z.string().optional().describe("Course ID (e.g., '002051-1264')"),
        code: z
          .string()
          .optional()
          .describe(
            "Course code (e.g., 'COS 226'). Preferred over courseId when both are provided."
          ),
        term: z.number().optional().describe("Term code to disambiguate when searching by code."),
      }),
    },
    async ({ courseId, code, term }) => {
      const resolved = await resolveCourseInput(db, { courseId, code, term });
      if (!resolved.value)
        return buildResolutionError(resolved.error ?? "Course not found.", resolved.options);

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

      const { enrolled: totalEnrolled, capacity: totalCapacity } = calculateEnrollment(sections);

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
                percentFull:
                  totalCapacity > 0
                    ? `${Math.round((totalEnrolled / totalCapacity) * 100)}%`
                    : "N/A",
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
