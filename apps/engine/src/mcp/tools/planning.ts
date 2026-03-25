import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { z } from "zod";
import { eq, and, desc, inArray, ne, sql } from "drizzle-orm";
import * as schema from "../../db/schema.js";
import { termCodeToName } from "../helpers.js";

// Sentinel value used by timeToValue() for sections with no meeting time
const NULL_TIME = -4200;

interface TimeSlot {
  courseCode: string;
  sectionTitle: string;
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

function hasRealMeetingTime(s: { days: number; startTime: number; endTime: number }): boolean {
  return s.days > 0 && s.startTime !== NULL_TIME && s.endTime !== NULL_TIME;
}

/** Course IDs in the DB follow the pattern {listing_id}-{term}, e.g. "002051-1264" */
function looksLikeCourseId(input: string): boolean {
  return /^\d{5,6}-\d{4}$/.test(input);
}

/**
 * Term codes are 4-digit numbers: even offset from base 1232 = Spring, odd = Fall.
 * Valid range: 1232 (Spring 2018) through ~1300s.
 */
function isValidTermCode(term: number): boolean {
  return Number.isInteger(term) && term >= 1232 && term <= 1400 && (term - 1232) % 2 === 0;
}

/**
 * Normalize a course code for ILIKE matching.
 * Users may type "COS 226" but the DB stores "COS226" (no space).
 * Also handles lowercase input.
 */
function normalizeCodeForSearch(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Resolve a single input string to a course in a given term.
 * Tries course ID first, then code-based ILIKE search.
 */
async function resolveCourseInTerm(
  db: NodePgDatabase,
  input: string,
  term: number
): Promise<{ id: string; code: string; term: number; status: string } | null> {
  if (looksLikeCourseId(input)) {
    const rows = await db
      .select({
        id: schema.courses.id,
        code: schema.courses.code,
        term: schema.courses.term,
        status: schema.courses.status,
      })
      .from(schema.courses)
      .where(and(eq(schema.courses.id, input), eq(schema.courses.term, term)))
      .limit(1);
    if (rows.length > 0) return rows[0];

    // The course ID embeds a term — if it doesn't match the requested term, try just
    // looking up the listing_id portion in the requested term
    const dashIdx = input.lastIndexOf("-");
    if (dashIdx > 0) {
      const listingId = input.substring(0, dashIdx);
      const rows2 = await db
        .select({
          id: schema.courses.id,
          code: schema.courses.code,
          term: schema.courses.term,
          status: schema.courses.status,
        })
        .from(schema.courses)
        .where(and(eq(schema.courses.listingId, listingId), eq(schema.courses.term, term)))
        .limit(1);
      return rows2[0] ?? null;
    }
    return null;
  }

  // Code-based search: try with original spacing first, then without spaces
  const normalized = normalizeCodeForSearch(input);
  const withoutSpace = normalized.replace(/\s+/g, "");
  const rows = await db
    .select({
      id: schema.courses.id,
      code: schema.courses.code,
      term: schema.courses.term,
      status: schema.courses.status,
    })
    .from(schema.courses)
    .where(
      and(
        eq(schema.courses.term, term),
        sql`(${schema.courses.code} ILIKE ${normalized + "%"} OR ${schema.courses.code} ILIKE ${withoutSpace + "%"})`
      )
    )
    .orderBy(desc(schema.courses.term))
    .limit(1);
  return rows[0] ?? null;
}

export function registerPlanningTools(server: McpServer, db: NodePgDatabase) {
  server.tool(
    "check_if_exists_in_term",
    "Check whether one or more courses exist (are offered) in a specific term. Returns the course info for each if found, or a message if not offered that term. Course codes in the DB may lack spaces (e.g., 'COS226' not 'COS 226') and may include cross-listings (e.g., 'COS126 / EGR126'). Accepts course codes, course IDs, or a mix of both.",
    {
      codes: z
        .array(z.string())
        .optional()
        .describe("Course codes to search for (e.g., ['COS 226', 'MAT 202']). Spaces are optional."),
      courseIds: z
        .array(z.string())
        .optional()
        .describe("Course IDs in format '{listing_id}-{term}' (e.g., ['002051-1264']). If the term in an ID differs from the 'term' parameter, the listing_id is used to search in the requested term."),
      term: z
        .number()
        .describe("4-digit Princeton term code (e.g., 1264 = Spring 2026). Even offset from 1232: even = Spring, odd offset = Fall."),
    },
    async ({ codes, courseIds, term }) => {
      if ((!codes || codes.length === 0) && (!courseIds || courseIds.length === 0)) {
        return {
          content: [{ type: "text" as const, text: "Provide at least one entry in 'codes' or 'courseIds'." }],
          isError: true,
        };
      }

      if (!isValidTermCode(term)) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Invalid term code ${term}. Term codes are 4-digit even-offset numbers from 1232 (e.g., 1262 = Fall 2025, 1264 = Spring 2026). Use even offsets: 1232, 1234, ..., 1264, ...`,
            },
          ],
          isError: true,
        };
      }

      // Build a list of queries to run: each is { label, conditions }
      const queries: { label: string; conditions: ReturnType<typeof eq>[] }[] = [];

      for (const code of codes ?? []) {
        const normalized = normalizeCodeForSearch(code);
        const withoutSpace = normalized.replace(/\s+/g, "");
        queries.push({
          label: code,
          conditions: [
            eq(schema.courses.term, term),
            sql`(${schema.courses.code} ILIKE ${normalized + "%"} OR ${schema.courses.code} ILIKE ${withoutSpace + "%"})`,
          ],
        });
      }

      for (const courseId of courseIds ?? []) {
        if (!looksLikeCourseId(courseId)) {
          queries.push({ label: courseId, conditions: [] }); // will produce not-found
          continue;
        }
        const dashIdx = courseId.lastIndexOf("-");
        const listingId = courseId.substring(0, dashIdx);
        queries.push({
          label: courseId,
          conditions: [
            eq(schema.courses.term, term),
            eq(schema.courses.listingId, listingId),
          ],
        });
      }

      const results: Record<string, unknown>[] = [];

      for (const q of queries) {
        if (q.conditions.length === 0) {
          results.push({
            query: q.label,
            exists: false,
            term,
            termName: termCodeToName(term),
            message: `Invalid courseId format '${q.label}'. Expected format: '{listing_id}-{term}'.`,
          });
          continue;
        }

        const rows = await db
          .select({
            id: schema.courses.id,
            code: schema.courses.code,
            title: schema.courses.title,
            term: schema.courses.term,
            status: schema.courses.status,
            dists: schema.courses.dists,
          })
          .from(schema.courses)
          .where(and(...q.conditions))
          .limit(5);

        if (rows.length === 0) {
          results.push({
            query: q.label,
            exists: false,
            term,
            termName: termCodeToName(term),
            message: `No matching course found for '${q.label}' in ${termCodeToName(term)} (${term}).`,
          });
          continue;
        }

        const canceled = rows.filter((r) => r.status === "canceled");
        const active = rows.filter((r) => r.status !== "canceled");

        results.push({
          query: q.label,
          exists: active.length > 0,
          term,
          termName: termCodeToName(term),
          courses: rows.map((r) => ({ ...r, termName: termCodeToName(r.term) })),
          ...(canceled.length > 0 && active.length === 0
            ? { warning: "Course exists in this term but is canceled." }
            : {}),
          ...(canceled.length > 0 && active.length > 0
            ? { warning: `${canceled.length} of ${rows.length} matching course(s) are canceled.` }
            : {}),
        });
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ term, termName: termCodeToName(term), results }, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "check_conflicts",
    "Check whether a set of courses conflict in schedule. Takes a list of course codes or IDs (all in the same term) and returns any time conflicts, plus whether a conflict-free section assignment exists. Course codes may omit spaces (e.g., 'COS 226' or 'COS226' both work). Sections with no meeting time (e.g., independent study) are excluded from conflict checks.",
    {
      term: z
        .number()
        .describe("4-digit Princeton term code (e.g., 1264 = Spring 2026). Even offset from 1232."),
      courses: z
        .array(z.string())
        .min(1, "Provide at least 1 entry. Comma-separated values (e.g., 'COS 226, COS 217') within a single string are automatically split.")
        .max(10, "Maximum 10 courses per conflict check to keep response times reasonable.")
        .describe("List of course codes (e.g., ['COS 226', 'MAT 202']) or course IDs (e.g., ['002051-1264']). Comma-separated values in a single string are automatically split. All courses are looked up in the specified term."),
    },
    async ({ term, courses: courseInputs }) => {
      if (!isValidTermCode(term)) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Invalid term code ${term}. Term codes are 4-digit even-offset numbers from 1232 (e.g., 1262 = Fall 2025, 1264 = Spring 2026).`,
            },
          ],
          isError: true,
        };
      }

      // Split any comma-separated entries into individual course inputs
      const expandedInputs: string[] = [];
      for (const input of courseInputs) {
        const parts = input.split(",").map((s) => s.trim()).filter(Boolean);
        expandedInputs.push(...parts);
      }

      // Deduplicate inputs (case-insensitive, space-insensitive)
      const seen = new Set<string>();
      const uniqueInputs: string[] = [];
      for (const input of expandedInputs) {
        const key = input.trim().toUpperCase().replace(/\s+/g, "");
        if (!seen.has(key)) {
          seen.add(key);
          uniqueInputs.push(input);
        }
      }

      if (uniqueInputs.length < 2) {
        return {
          content: [
            {
              type: "text" as const,
              text: "After deduplication, fewer than 2 unique courses remain. Provide at least 2 distinct courses.",
            },
          ],
          isError: true,
        };
      }

      // Resolve all course inputs to actual course records in the given term
      const resolved: { id: string; code: string; term: number; status: string }[] = [];
      const notFound: string[] = [];
      const canceledWarnings: string[] = [];

      for (const input of uniqueInputs) {
        const course = await resolveCourseInTerm(db, input, term);
        if (course) {
          // Check for duplicate resolved IDs (e.g., "COS 126" and "EGR 126" are cross-listed)
          if (resolved.some((r) => r.id === course.id)) {
            continue; // skip duplicate
          }
          if (course.status === "canceled") {
            canceledWarnings.push(`${course.code} is canceled in ${termCodeToName(term)}.`);
          }
          resolved.push(course);
        } else {
          notFound.push(input);
        }
      }

      if (resolved.length < 2) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  feasible: false,
                  error: `Only ${resolved.length} course(s) found in ${termCodeToName(term)} — need at least 2 to check conflicts.`,
                  resolved: resolved.map((r) => r.code),
                  notFound,
                  term,
                  termName: termCodeToName(term),
                  hint: "Courses may not be offered this term, or the code format may differ. Use search_courses to find the correct codes.",
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      // Fetch all non-canceled sections for resolved courses in a single query
      const courseIdToCode = new Map(resolved.map((r) => [r.id, r.code]));
      const allSections = await db
        .select({
          courseId: schema.sections.courseId,
          title: schema.sections.title,
          days: schema.sections.days,
          startTime: schema.sections.startTime,
          endTime: schema.sections.endTime,
        })
        .from(schema.sections)
        .where(
          and(
            inArray(schema.sections.courseId, resolved.map((r) => r.id)),
            ne(schema.sections.status, "canceled")
          )
        );

      // Group sections by course, then by section type
      const courseSections: {
        courseCode: string;
        courseId: string;
        sectionTypes: Map<string, TimeSlot[]>;
        hasNoMeetingSections: boolean;
      }[] = [];

      for (const course of resolved) {
        const sections = allSections.filter((s) => s.courseId === course.id);
        let hasNoMeetingSections = false;
        const byType = new Map<string, TimeSlot[]>();
        for (const s of sections) {
          if (!hasRealMeetingTime(s)) {
            hasNoMeetingSections = true;
            continue;
          }
          const type = sectionTypePrefix(s.title);
          if (!byType.has(type)) byType.set(type, []);
          byType.get(type)!.push({
            courseCode: course.code,
            sectionTitle: s.title,
            days: s.days,
            startTime: s.startTime,
            endTime: s.endTime,
          });
        }

        courseSections.push({
          courseCode: course.code,
          courseId: course.id,
          sectionTypes: byType,
          hasNoMeetingSections,
        });
      }

      // Collect warnings for courses with no scheduled sections at all
      const noSectionWarnings = courseSections
        .filter((cs) => cs.sectionTypes.size === 0)
        .map((cs) => `${cs.courseCode} has no scheduled meeting times (may be independent study or TBA).`);

      // Only conflict-check courses that have real sections
      const checkable = courseSections.filter((cs) => cs.sectionTypes.size > 0);

      if (checkable.length < 2) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  term,
                  termName: termCodeToName(term),
                  coursesChecked: resolved.map((r) => r.code),
                  notFound: notFound.length > 0 ? notFound : undefined,
                  feasible: true,
                  message: "Fewer than 2 courses have scheduled meeting times — no conflicts possible.",
                  warnings: [...canceledWarnings, ...noSectionWarnings],
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Find all pairwise section conflicts
      const allSlots: TimeSlot[] = [];
      for (const cs of checkable) {
        for (const slots of cs.sectionTypes.values()) {
          allSlots.push(...slots);
        }
      }

      const conflictSet = new Set<string>();
      const pairwiseConflicts: string[] = [];
      for (let i = 0; i < allSlots.length; i++) {
        for (let j = i + 1; j < allSlots.length; j++) {
          if (allSlots[i].courseCode === allSlots[j].courseCode) continue;
          if (timeSlotsOverlap(allSlots[i], allSlots[j])) {
            const key = `${allSlots[i].courseCode} (${allSlots[i].sectionTitle}) conflicts with ${allSlots[j].courseCode} (${allSlots[j].sectionTitle})`;
            if (!conflictSet.has(key)) {
              conflictSet.add(key);
              pairwiseConflicts.push(key);
            }
          }
        }
      }

      // Check feasibility via backtracking: pick one section per type per course
      const choiceGroups: { courseCode: string; type: string; options: TimeSlot[] }[] = [];
      for (const cs of checkable) {
        for (const [type, slots] of cs.sectionTypes) {
          choiceGroups.push({ courseCode: cs.courseCode, type, options: slots });
        }
      }

      const chosen: TimeSlot[] = [];
      function solve(groupIdx: number): boolean {
        if (groupIdx === choiceGroups.length) return true;
        const group = choiceGroups[groupIdx];
        for (const option of group.options) {
          const hasConflict = chosen.some(
            (c) => c.courseCode !== option.courseCode && timeSlotsOverlap(c, option)
          );
          if (!hasConflict) {
            chosen.push(option);
            if (solve(groupIdx + 1)) return true;
            chosen.pop();
          }
        }
        return false;
      }

      const feasible = solve(0);
      const warnings = [...canceledWarnings, ...noSectionWarnings];

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                term,
                termName: termCodeToName(term),
                coursesChecked: resolved.map((r) => r.code),
                notFound: notFound.length > 0 ? notFound : undefined,
                feasible,
                ...(feasible
                  ? {}
                  : {
                      infeasibleReason:
                        "No valid combination of sections exists that avoids all time conflicts between these courses.",
                    }),
                conflictCount: pairwiseConflicts.length,
                conflicts: pairwiseConflicts.length > 0 ? pairwiseConflicts : "No conflicts",
                chosenSections: feasible
                  ? chosen.map((s) => ({
                      course: s.courseCode,
                      section: s.sectionTitle,
                      days: s.days,
                      startTime: s.startTime,
                      endTime: s.endTime,
                    }))
                  : undefined,
                ...(warnings.length > 0 ? { warnings } : {}),
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

