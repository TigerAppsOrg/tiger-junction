import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { z } from "zod";
import { join } from "path";
import {
  loadAllPrereqs,
  evaluatePrereqs,
  describePrereqs,
} from "../../prerequisites/index.js";
import type { PrereqCourse } from "../../prerequisites/index.js";

// Lazily loaded prereq data
let prereqData: Map<
  string,
  { course: PrereqCourse; deptVars: Array<{ name: string; equ: string }> }
> | null = null;

function getPrereqData() {
  if (!prereqData) {
    // Path from src/mcp/tools/ -> apps/prerequisites/lib
    const libDir = join(__dirname, "../../../../prerequisites/lib");
    prereqData = loadAllPrereqs(libDir);
  }
  return prereqData;
}

/** Normalize "COS 226" / "cos226" / "COS226" -> "COS 226" */
function normalizeCourseCode(code: string): string {
  const stripped = code.trim().toUpperCase().replace(/\s+/g, "");
  if (stripped.length > 3 && /^[A-Z]{3}\d/.test(stripped)) {
    return stripped.slice(0, 3) + " " + stripped.slice(3);
  }
  return stripped;
}

export function registerPrerequisiteTools(server: McpServer, _db: NodePgDatabase) {
  server.tool(
    "get_prerequisites",
    "Get the prerequisites for one or more courses from the manually-curated prerequisites database. Returns the prerequisite expression, a human-readable description, and any notes for each course. Course codes can be with or without spaces (e.g., 'COS 226' or 'COS226'). NOTE: Not all courses are in this database (especially newer or renumbered courses). If a course is not found, follow up with search_courses and get_course_details to find the course and check its description for prerequisite information.",
    {
      courses: z
        .array(z.string())
        .min(1)
        .describe(
          "Course codes to look up (e.g., ['COS 226', 'COS 217', 'MAT 202']). Spaces are optional."
        ),
    },
    async ({ courses }) => {
      const data = getPrereqData();
      const results: Record<string, unknown>[] = [];

      for (const course of courses) {
        const normalized = normalizeCourseCode(course);
        const entry = data.get(normalized);

        if (!entry) {
          results.push({
            course: normalized,
            found: false,
            message: `Course '${normalized}' not found in prerequisites database. It may not exist, may be a new course, or may have no prerequisite data entered yet. Use search_courses or get_course_details to verify the course exists and check its description for prerequisite info.`,
          });
          continue;
        }

        const c = entry.course;
        const result: Record<string, unknown> = {
          course: c.course,
          found: true,
          hasPrereqs: !!c.reqs,
        };

        if (c.reqs) {
          result.rawExpression = c.reqs;
          result.description = describePrereqs(c.reqs, entry.deptVars);
        } else {
          result.description = "No prerequisites required.";
        }

        if (c.equiv && c.equiv.length > 0) result.equivalentCourses = c.equiv;
        if (c.notes) result.notes = c.notes;
        if (c.iw !== undefined) result.independentWork = true;
        if (c.travel !== undefined) result.requiresTravel = true;

        results.push(result);
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }],
      };
    }
  );

  server.tool(
    "check_prerequisites",
    "Check whether a student can take one or more courses given their completed courses. Returns whether prerequisites are satisfied and which specific courses are missing for each. Course codes can be with or without spaces. If a course is not found in the prerequisites database, use search_courses and get_course_details as a fallback to find prerequisite info in the course description.",
    {
      courses: z
        .array(z.string())
        .min(1)
        .describe("Courses to check prerequisites for (e.g., ['COS 226', 'COS 217'])."),
      completedCourses: z
        .array(z.string())
        .describe(
          "List of courses the student has completed (e.g., ['COS 126', 'MAT 202'])."
        ),
      currentCourses: z
        .array(z.string())
        .optional()
        .describe(
          "Courses being taken this semester (for corequisite checks). Optional."
        ),
    },
    async ({ courses, completedCourses, currentCourses }) => {
      const data = getPrereqData();
      const normalizedCompleted = completedCourses.map(normalizeCourseCode);
      const normalizedCurrent = (currentCourses ?? []).map(normalizeCourseCode);
      const results: Record<string, unknown>[] = [];

      for (const course of courses) {
        const normalized = normalizeCourseCode(course);
        const entry = data.get(normalized);

        if (!entry) {
          results.push({
            course: normalized,
            found: false,
            message: `Course '${normalized}' not found in prerequisites database. Use search_courses or get_course_details to verify the course exists and check its description for prerequisite info.`,
          });
          continue;
        }

        const c = entry.course;
        if (!c.reqs) {
          results.push({
            course: c.course,
            found: true,
            satisfied: true,
            message: "This course has no prerequisites.",
          });
          continue;
        }

        const evalResult = evaluatePrereqs(
          c.reqs,
          normalizedCompleted,
          normalizedCurrent,
          entry.deptVars
        );

        results.push({
          course: c.course,
          found: true,
          satisfied: evalResult.satisfied,
          rawExpression: c.reqs,
          description: describePrereqs(c.reqs, entry.deptVars),
          missingCourses: evalResult.missingCourses,
        });
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                completedCourses: normalizedCompleted,
                ...(currentCourses ? { currentCourses: normalizedCurrent } : {}),
                results,
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
    "what_can_i_take",
    "Given a list of completed courses, find all courses in a department (or all departments) whose prerequisites are satisfied. Useful for planning what to take next.",
    {
      completedCourses: z
        .array(z.string())
        .describe("List of courses the student has completed."),
      department: z
        .string()
        .optional()
        .describe(
          "Filter to a specific department (e.g., 'COS'). If omitted, checks all departments."
        ),
      currentCourses: z
        .array(z.string())
        .optional()
        .describe("Courses being taken this semester (for corequisite checks)."),
    },
    async ({ completedCourses, department, currentCourses }) => {
      const data = getPrereqData();
      const normalizedCompleted = completedCourses.map(normalizeCourseCode);
      const normalizedCurrent = (currentCourses ?? []).map(normalizeCourseCode);
      const completedSet = new Set(normalizedCompleted);

      const canTake: Array<{ course: string; prereqs: string | null }> = [];
      const blocked: Array<{
        course: string;
        prereqs: string;
        missing: string[];
      }> = [];

      for (const [code, entry] of data) {
        if (department && !code.startsWith(department.toUpperCase())) continue;
        // Skip courses already completed
        if (completedSet.has(code.replace(/\s+/g, "").toUpperCase())) continue;

        const c = entry.course;
        if (!c.reqs) {
          canTake.push({ course: c.course, prereqs: null });
          continue;
        }

        const result = evaluatePrereqs(
          c.reqs,
          normalizedCompleted,
          normalizedCurrent,
          entry.deptVars
        );
        if (result.satisfied) {
          canTake.push({ course: c.course, prereqs: c.reqs });
        } else {
          blocked.push({
            course: c.course,
            prereqs: c.reqs,
            missing: result.missingCourses,
          });
        }
      }

      canTake.sort((a, b) => a.course.localeCompare(b.course));
      blocked.sort((a, b) => a.course.localeCompare(b.course));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                department: department?.toUpperCase() ?? "ALL",
                completedCourses: normalizedCompleted,
                canTake: { count: canTake.length, courses: canTake },
                blocked: { count: blocked.length, courses: blocked },
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
