import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { termCodeToName, valueToDays, valueToTime } from "../helpers.js";
import type { AuthContext } from "../context.js";

// Supabase status encoding: 0=open, 1=closed, 2=canceled
const STATUS_MAP: Record<number, string> = { 0: "open", 1: "closed", 2: "canceled" };
function statusName(code: number | null): string {
  return code != null ? (STATUS_MAP[code] ?? "unknown") : "unknown";
}

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

function formatSectionForDisplay(s: {
  title: string;
  days: number;
  start_time: number;
  end_time: number;
  room?: string | null;
  status: number | null;
}) {
  return {
    sectionTitle: s.title,
    days: valueToDays(s.days),
    startTime: valueToTime(s.start_time),
    endTime: valueToTime(s.end_time),
    room: s.room ?? null,
    status: statusName(s.status),
  };
}

/**
 * Resolve the authenticated user's Supabase UUID via:
 * NetID → Supabase RPC get_user_id_by_netid → Supabase UUID
 *
 * Uses a Supabase database function that looks up auth.users by email
 * ({netid}@princeton.edu), avoiding dependency on the engine's local users table.
 */
async function resolveSupabaseUserId(
  supabase: SupabaseClient,
  authContext?: AuthContext
): Promise<{ supabaseUuid?: string; error?: string }> {
  if (!authContext?.netid) {
    return { error: "Missing user context. Provide x-user-netid header." };
  }

  const { data, error } = await supabase.rpc("get_user_id_by_netid", {
    netid: authContext.netid,
  });

  if (error) {
    return { error: `Failed to resolve NetID '${authContext.netid}': ${error.message}` };
  }

  if (!data) {
    return {
      error: `No TigerJunction account found for NetID '${authContext.netid}'. Create a TigerJunction account first to access schedule features.`,
    };
  }

  return { supabaseUuid: data as string };
}

export function registerJunctionScheduleTools(
  server: McpServer,
  supabase: SupabaseClient,
  authContext?: AuthContext
) {
  // ── get_user_schedules ──────────────────────────────────────────────
  server.tool(
    "get_user_schedules",
    "Get all schedules for the authenticated user, optionally filtered by term.",
    {
      term: z
        .number()
        .optional()
        .describe(
          "Term code to filter by. Mapping: 1232=Fall 2022, 1234=Spring 2023, 1242=Fall 2023, 1244=Spring 2024, 1252=Fall 2024, 1254=Spring 2025, 1262=Fall 2025, 1264=Spring 2026 (current). Codes ending in 2=Fall, ending in 4=Spring."
        ),
    },
    async ({ term }) => {
      const auth = await resolveSupabaseUserId(supabase, authContext);
      if (!auth.supabaseUuid) {
        return { content: [{ type: "text" as const, text: auth.error ?? "Unauthorized." }], isError: true };
      }

      let query = supabase
        .from("schedules")
        .select("id, title, term, is_public")
        .eq("user_id", auth.supabaseUuid)
        .order("term", { ascending: true });

      if (term != null) {
        query = query.eq("term", term);
      }

      const { data: schedules, error } = await query;

      if (error) {
        return { content: [{ type: "text" as const, text: `Failed to fetch schedules: ${error.message}` }], isError: true };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: schedules?.length ?? 0,
                schedules: (schedules ?? []).map((s) => ({
                  ...s,
                  termName: termCodeToName(s.term),
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

  // ── get_schedule_details ────────────────────────────────────────────
  server.tool(
    "get_schedule_details",
    "Get full details of a schedule including its courses, sections, meeting times, and any time conflicts.",
    {
      scheduleId: z.number().describe("Schedule ID"),
    },
    async ({ scheduleId }) => {
      const auth = await resolveSupabaseUserId(supabase, authContext);
      if (!auth.supabaseUuid) {
        return { content: [{ type: "text" as const, text: auth.error ?? "Unauthorized." }], isError: true };
      }

      // Fetch the schedule and verify ownership
      const { data: schedule, error: schedError } = await supabase
        .from("schedules")
        .select("id, title, term, is_public, user_id")
        .eq("id", scheduleId)
        .single();

      if (schedError || !schedule) {
        return { content: [{ type: "text" as const, text: "Schedule not found." }], isError: true };
      }
      if (schedule.user_id !== auth.supabaseUuid) {
        return {
          content: [{ type: "text" as const, text: "Forbidden: schedule does not belong to authenticated user." }],
          isError: true,
        };
      }

      // Fetch course associations
      const { data: associations } = await supabase
        .from("course_schedule_associations")
        .select("course_id, metadata")
        .eq("schedule_id", scheduleId);

      if (!associations || associations.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  schedule: { id: schedule.id, title: schedule.title, term: schedule.term, termName: termCodeToName(schedule.term) },
                  courses: [],
                  sections: [],
                  conflicts: "No courses in this schedule",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const courseIds = associations.map((a) => a.course_id);

      // Fetch courses
      const { data: courses } = await supabase
        .from("courses")
        .select("id, code, title, status")
        .in("id", courseIds);

      const courseMap = new Map((courses ?? []).map((c) => [c.id, c]));

      // Fetch sections for all courses
      const { data: sections } = await supabase
        .from("sections")
        .select("id, course_id, title, days, start_time, end_time, room, status, cap, tot")
        .in("course_id", courseIds);

      // Build section list with course codes and detect conflicts
      const allSections: (TimeSlot & { courseCode: string; sectionTitle: string; room: string | null; status: string })[] = [];

      for (const s of sections ?? []) {
        const course = courseMap.get(s.course_id);
        if (!course) continue;
        allSections.push({
          courseCode: course.code,
          sectionTitle: s.title,
          days: s.days,
          startTime: s.start_time,
          endTime: s.end_time,
          room: s.room,
          status: statusName(s.status),
        });
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
                schedule: { id: schedule.id, title: schedule.title, term: schedule.term, termName: termCodeToName(schedule.term) },
                courses: (courses ?? []).map((c) => ({
                  id: c.id,
                  code: c.code,
                  title: c.title,
                  status: statusName(c.status),
                })),
                sections: allSections.map((s) => ({
                  courseCode: s.courseCode,
                  sectionTitle: s.sectionTitle,
                  days: valueToDays(s.days),
                  startTime: valueToTime(s.startTime),
                  endTime: valueToTime(s.endTime),
                  room: s.room,
                  status: s.status,
                })),
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

  // ── verify_schedule ─────────────────────────────────────────────────
  server.tool(
    "verify_schedule",
    "Validate a proposed schedule of courses. Checks for: time conflicts between sections, mixed terms, missing section types (e.g., no precept selected when required), closed/canceled sections, duplicate courses, and exceeding 7 courses. Returns valid=true or a list of issues.",
    {
      courseCodes: z
        .array(z.string())
        .min(1)
        .max(10)
        .describe("Array of course codes to validate together (e.g., ['COS 226', 'MAT 202', 'ECO 100'])"),
      term: z
        .number()
        .optional()
        .describe("Term code. If omitted, uses the most recent term each course is offered."),
    },
    async ({ courseCodes, term }) => {
      const issues: string[] = [];
      const resolvedCourses: {
        code: string;
        courseId: number;
        term: number;
        status: string;
        sections: { title: string; type: string; days: number; startTime: number; endTime: number; status: string; cap: number; tot: number }[];
      }[] = [];

      for (const code of courseCodes) {
        // Query Supabase courses by code (handle both "COS 330" and "COS330")
        const noSpace = code.replace(/\s+/g, "");
        const withSpace = code.replace(/([A-Za-z])(\d)/, "$1 $2");
        let courseQuery = supabase
          .from("courses")
          .select("id, code, term, status")
          .or(`code.ilike.${noSpace},code.ilike.${withSpace}`);

        if (term != null) {
          courseQuery = courseQuery.eq("term", term);
        }

        const { data: matchedCourses } = await courseQuery.order("term", { ascending: false }).limit(1);

        if (!matchedCourses || matchedCourses.length === 0) {
          issues.push(`Course not found: "${code}"`);
          continue;
        }

        const course = matchedCourses[0];
        const courseStatus = statusName(course.status);

        // Check for duplicates
        if (resolvedCourses.some((c) => c.courseId === course.id)) {
          issues.push(`Duplicate course: ${course.code}`);
          continue;
        }

        // Fetch sections
        const { data: sections } = await supabase
          .from("sections")
          .select("title, days, start_time, end_time, status, cap, tot")
          .eq("course_id", course.id);

        resolvedCourses.push({
          code: course.code,
          courseId: course.id,
          term: course.term,
          status: courseStatus,
          sections: (sections ?? []).map((s) => ({
            title: s.title,
            type: sectionTypePrefix(s.title),
            days: s.days,
            startTime: s.start_time,
            endTime: s.end_time,
            status: statusName(s.status),
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

      // Check: section completeness
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
            issues.push(
              `All ${type} sections full: all ${type} sections for ${course.code} are closed (${sections[0].tot}/${sections[0].cap} enrolled)`
            );
          }
        }

        if (course.sections.length === 0) {
          issues.push(`No sections: ${course.code} has no sections listed`);
        }
      }

      // Check: time conflicts between courses
      for (let i = 0; i < resolvedCourses.length; i++) {
        for (let j = i + 1; j < resolvedCourses.length; j++) {
          const a = resolvedCourses[i];
          const b = resolvedCourses[j];

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

          for (const [aType, aSections] of aByType) {
            for (const [bType, bSections] of bByType) {
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

  // ── WRITE TOOLS ─────────────────────────────────────────────────────

  // Helper: verify schedule ownership and return the schedule row
  async function verifyScheduleOwnership(
    scheduleId: number,
    supabaseUuid: string
  ): Promise<{ schedule?: { id: number; term: number; title: string; user_id: string }; error?: string }> {
    const { data, error } = await supabase
      .from("schedules")
      .select("id, term, title, user_id")
      .eq("id", scheduleId)
      .single();

    if (error || !data) return { error: "Schedule not found." };
    if (data.user_id !== supabaseUuid) return { error: "Forbidden: schedule does not belong to authenticated user." };
    return { schedule: data };
  }

  // Helper: resolve course by code within a term
  async function resolveCourseByCode(
    code: string,
    term: number
  ): Promise<{ course?: { id: number; code: string; title: string }; error?: string }> {
    // Supabase stores codes without spaces (e.g., "COS330"), but users type "COS 330".
    // Try both the original and a no-space version.
    const noSpace = code.replace(/\s+/g, "");
    const withSpace = code.replace(/([A-Za-z])(\d)/, "$1 $2");

    const { data } = await supabase
      .from("courses")
      .select("id, code, title")
      .or(`code.ilike.${noSpace},code.ilike.${withSpace}`)
      .eq("term", term)
      .limit(1);

    if (!data || data.length === 0) {
      return { error: `Course "${code}" not found for term ${termCodeToName(term)} (${term}).` };
    }
    return { course: data[0] };
  }

  // Helper: generate metadata for a course being added to a schedule
  async function generateCourseMetadata(
    scheduleId: number,
    courseId: number
  ): Promise<{ complete: boolean; color: number; sections: string[]; confirms: Record<string, string> }> {
    // Pick a color: find unused 0-6 among existing courses in this schedule
    const { data: existingAssocs } = await supabase
      .from("course_schedule_associations")
      .select("metadata")
      .eq("schedule_id", scheduleId);

    const usedColors = new Map<number, number>();
    for (const a of existingAssocs ?? []) {
      const meta = a.metadata as { color?: number } | null;
      if (meta?.color != null) {
        usedColors.set(meta.color, (usedColors.get(meta.color) ?? 0) + 1);
      }
    }

    let color = 0;
    for (let c = 0; c <= 6; c++) {
      if (!usedColors.has(c)) { color = c; break; }
      if (c === 6) {
        // All used — pick least-used
        let minCount = Infinity;
        for (const [col, count] of usedColors) {
          if (count < minCount) { minCount = count; color = col; }
        }
      }
    }

    // Fetch sections for the course and extract categories
    const { data: sections } = await supabase
      .from("sections")
      .select("title, category")
      .eq("course_id", courseId);

    const categoryMap = new Map<string, string[]>();
    for (const s of sections ?? []) {
      const cat = s.category;
      if (!categoryMap.has(cat)) categoryMap.set(cat, []);
      categoryMap.get(cat)!.push(s.title);
    }

    const sectionCategories = [...categoryMap.keys()].sort();

    // Auto-confirm categories with exactly 1 section
    const confirms: Record<string, string> = {};
    for (const [cat, titles] of categoryMap) {
      if (titles.length === 1) {
        confirms[cat] = titles[0];
      }
    }

    const complete = sectionCategories.every((cat) => confirms[cat] != null);

    return { complete, color, sections: sectionCategories, confirms };
  }

  // ── create_schedule ─────────────────────────────────────────────────
  server.tool(
    "create_schedule",
    "Create a new schedule for the authenticated user.",
    {
      term: z.number().describe("Term code for the schedule (e.g., 1272 for Fall 2026)."),
      title: z.string().optional().describe("Schedule title (default: 'My Schedule')."),
    },
    async ({ term, title }) => {
      const auth = await resolveSupabaseUserId(supabase, authContext);
      if (!auth.supabaseUuid) {
        return { content: [{ type: "text" as const, text: auth.error ?? "Unauthorized." }], isError: true };
      }

      const { data, error } = await supabase
        .from("schedules")
        .insert({ user_id: auth.supabaseUuid, term, title: title ?? "My Schedule" })
        .select("id, title, term")
        .single();

      if (error) {
        return { content: [{ type: "text" as const, text: `Failed to create schedule: ${error.message}` }], isError: true };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ created: true, schedule: { ...data, termName: termCodeToName(data.term) } }, null, 2),
          },
        ],
      };
    }
  );

  // ── add_course_to_schedule ──────────────────────────────────────────
  server.tool(
    "add_course_to_schedule",
    "Add a course to an existing schedule. Automatically generates metadata (color, section categories). The course must exist for the schedule's term.",
    {
      scheduleId: z.number().describe("Schedule ID to add the course to."),
      courseCode: z.string().describe("Course code (e.g., 'COS 226')."),
    },
    async ({ scheduleId, courseCode }) => {
      const auth = await resolveSupabaseUserId(supabase, authContext);
      if (!auth.supabaseUuid) {
        return { content: [{ type: "text" as const, text: auth.error ?? "Unauthorized." }], isError: true };
      }

      const ownership = await verifyScheduleOwnership(scheduleId, auth.supabaseUuid);
      if (!ownership.schedule) {
        return { content: [{ type: "text" as const, text: ownership.error ?? "Schedule error." }], isError: true };
      }

      const resolved = await resolveCourseByCode(courseCode, ownership.schedule.term);
      if (!resolved.course) {
        return { content: [{ type: "text" as const, text: resolved.error ?? "Course not found." }], isError: true };
      }

      // Check if already in schedule
      const { data: existing } = await supabase
        .from("course_schedule_associations")
        .select("course_id")
        .eq("schedule_id", scheduleId)
        .eq("course_id", resolved.course.id)
        .limit(1);

      if (existing && existing.length > 0) {
        return {
          content: [{ type: "text" as const, text: `${resolved.course.code} is already in this schedule.` }],
          isError: true,
        };
      }

      const metadata = await generateCourseMetadata(scheduleId, resolved.course.id);

      const { error } = await supabase
        .from("course_schedule_associations")
        .insert({ course_id: resolved.course.id, schedule_id: scheduleId, metadata });

      if (error) {
        return { content: [{ type: "text" as const, text: `Failed to add course: ${error.message}` }], isError: true };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                added: true,
                course: resolved.course,
                scheduleId,
                metadata,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ── remove_course_from_schedule ─────────────────────────────────────
  server.tool(
    "remove_course_from_schedule",
    "Remove a course from a schedule.",
    {
      scheduleId: z.number().describe("Schedule ID."),
      courseCode: z.string().describe("Course code to remove (e.g., 'COS 226')."),
    },
    async ({ scheduleId, courseCode }) => {
      const auth = await resolveSupabaseUserId(supabase, authContext);
      if (!auth.supabaseUuid) {
        return { content: [{ type: "text" as const, text: auth.error ?? "Unauthorized." }], isError: true };
      }

      const ownership = await verifyScheduleOwnership(scheduleId, auth.supabaseUuid);
      if (!ownership.schedule) {
        return { content: [{ type: "text" as const, text: ownership.error ?? "Schedule error." }], isError: true };
      }

      const resolved = await resolveCourseByCode(courseCode, ownership.schedule.term);
      if (!resolved.course) {
        return { content: [{ type: "text" as const, text: resolved.error ?? "Course not found." }], isError: true };
      }

      const { error, count } = await supabase
        .from("course_schedule_associations")
        .delete()
        .eq("schedule_id", scheduleId)
        .eq("course_id", resolved.course.id);

      if (error) {
        return { content: [{ type: "text" as const, text: `Failed to remove course: ${error.message}` }], isError: true };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ removed: true, course: resolved.course, scheduleId }, null, 2),
          },
        ],
      };
    }
  );

  // ── rename_schedule ─────────────────────────────────────────────────
  server.tool(
    "rename_schedule",
    "Rename a schedule.",
    {
      scheduleId: z.number().describe("Schedule ID."),
      title: z.string().describe("New title for the schedule."),
    },
    async ({ scheduleId, title }) => {
      const auth = await resolveSupabaseUserId(supabase, authContext);
      if (!auth.supabaseUuid) {
        return { content: [{ type: "text" as const, text: auth.error ?? "Unauthorized." }], isError: true };
      }

      const ownership = await verifyScheduleOwnership(scheduleId, auth.supabaseUuid);
      if (!ownership.schedule) {
        return { content: [{ type: "text" as const, text: ownership.error ?? "Schedule error." }], isError: true };
      }

      const { error } = await supabase
        .from("schedules")
        .update({ title })
        .eq("id", scheduleId);

      if (error) {
        return { content: [{ type: "text" as const, text: `Failed to rename schedule: ${error.message}` }], isError: true };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ renamed: true, scheduleId, newTitle: title }, null, 2),
          },
        ],
      };
    }
  );

  // ── delete_schedule ─────────────────────────────────────────────────
  server.tool(
    "delete_schedule",
    "Delete a schedule and all its course associations. This cannot be undone.",
    {
      scheduleId: z.number().describe("Schedule ID to delete."),
    },
    async ({ scheduleId }) => {
      const auth = await resolveSupabaseUserId(supabase, authContext);
      if (!auth.supabaseUuid) {
        return { content: [{ type: "text" as const, text: auth.error ?? "Unauthorized." }], isError: true };
      }

      const ownership = await verifyScheduleOwnership(scheduleId, auth.supabaseUuid);
      if (!ownership.schedule) {
        return { content: [{ type: "text" as const, text: ownership.error ?? "Schedule error." }], isError: true };
      }

      const { error } = await supabase
        .from("schedules")
        .delete()
        .eq("id", scheduleId);

      if (error) {
        return { content: [{ type: "text" as const, text: `Failed to delete schedule: ${error.message}` }], isError: true };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              deleted: true,
              scheduleId,
              title: ownership.schedule.title,
            }, null, 2),
          },
        ],
      };
    }
  );
}
