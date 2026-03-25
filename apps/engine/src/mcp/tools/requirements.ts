import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { z } from "zod";
import { join } from "path";
import {
  loadAllRequirements,
  listPrograms,
  checkRequirements,
  quickProgress,
} from "../../requirements/index.js";
import type {
  AllRequirements,
  RequirementNode,
  StudentCourse,
} from "../../requirements/index.js";

// ---------------------------------------------------------------------------
// Lazy-loaded requirement data
// ---------------------------------------------------------------------------

let reqData: AllRequirements | null = null;

function getReqData(): AllRequirements {
  if (!reqData) {
    const dataDir = join(
      __dirname,
      "../../../course_requirements/major_requirements/data"
    );
    reqData = loadAllRequirements(dataDir);
  }
  return reqData;
}

function lookupProgram(
  code: string
): { node: RequirementNode; type: string } | null {
  const data = getReqData();
  const upper = code.toUpperCase();

  if (data.majors.has(upper)) return { node: data.majors.get(upper)!, type: "Major" };
  if (data.minors.has(upper)) return { node: data.minors.get(upper)!, type: "Minor" };
  if (data.certificates.has(upper)) return { node: data.certificates.get(upper)!, type: "Certificate" };
  if (data.degrees.has(upper)) return { node: data.degrees.get(upper)!, type: "Degree" };

  // Try case-insensitive partial match
  for (const [k, v] of data.majors) {
    if (k.toUpperCase() === upper) return { node: v, type: "Major" };
  }
  for (const [k, v] of data.minors) {
    if (k.toUpperCase() === upper) return { node: v, type: "Minor" };
  }
  for (const [k, v] of data.certificates) {
    if (k.toUpperCase() === upper) return { node: v, type: "Certificate" };
  }
  return null;
}

/** Parse "COS 226" into { deptCode: "COS", catNum: "226" } */
function parseCourseCode(code: string): { id: string; deptCode: string; catNum: string } {
  const normalized = code.trim().toUpperCase();
  const stripped = normalized.replace(/\s+/g, "");
  const dept = stripped.slice(0, 3);
  const num = stripped.slice(3);
  const id = `${dept} ${num}`;
  return { id, deptCode: dept, catNum: num };
}

// ---------------------------------------------------------------------------
// Zod schemas reused across tools
// ---------------------------------------------------------------------------

const completedCoursesSchema = z
  .array(
    z.object({
      code: z.string().describe("Course code, e.g. 'COS 226'"),
      semester: z
        .number()
        .min(1)
        .max(8)
        .describe("Semester number (1=freshman fall, 8=senior spring)"),
      distributionArea: z
        .string()
        .optional()
        .describe(
          "Distribution area(s) of the course, e.g. 'QCR' or 'STL or QCR'. Optional but improves accuracy for distribution requirement checking."
        ),
    })
  )
  .describe("List of completed courses with semester info.");

function toStudentCourses(
  input: Array<{ code: string; semester: number; distributionArea?: string }>
): StudentCourse[] {
  return input.map((c) => {
    const parsed = parseCourseCode(c.code);
    return {
      id: parsed.id,
      deptCode: parsed.deptCode,
      catNum: parsed.catNum,
      distributionArea: c.distributionArea ?? null,
      semester: c.semester,
    };
  });
}

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

export function registerRequirementTools(
  server: McpServer,
  _db: NodePgDatabase
) {
  server.tool(
    "list_programs",
    "List all available majors, minors, certificates, and degrees at Princeton. Returns code, name, type, and whether independent work is required.",
    {
      type: z
        .enum(["Major", "Minor", "Certificate", "Degree", "all"])
        .optional()
        .describe("Filter by program type. Defaults to 'all'."),
    },
    async ({ type }) => {
      const data = getReqData();
      let programs = listPrograms(data);
      if (type && type !== "all") {
        programs = programs.filter((p) => p.type === type);
      }
      programs.sort((a, b) => a.code.localeCompare(b.code));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { count: programs.length, programs },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "get_program_requirements",
    "Get the full requirement tree for a major, minor, certificate, or degree. Shows all sub-requirements, course lists, distribution requirements, and explanations. Use program codes like 'COS-AB', 'COS-BSE', 'ECO', 'FIN' (minor), 'QCB' (certificate), 'AB', 'BSE' (degree).",
    {
      code: z
        .string()
        .describe(
          "Program code (e.g., 'COS-AB' for COS AB major, 'FIN' for Finance minor, 'AB' for AB degree)."
        ),
    },
    async ({ code }) => {
      const found = lookupProgram(code);
      if (!found) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  found: false,
                  code,
                  message: `Program '${code}' not found. Use list_programs to see available options.`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                found: true,
                type: found.type,
                code: found.node.code,
                name: found.node.name,
                degreeCode: found.node.degreeCode,
                description: found.node.description,
                urls: found.node.urls,
                contacts: found.node.contacts,
                iwRequired: found.node.iwRequired,
                requirements: formatTree(found.node),
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
    "check_program_progress",
    "Check how a student's completed courses satisfy the requirements for a specific major, minor, certificate, or degree. Returns a detailed breakdown of which requirements are met, which aren't, and which courses are counted toward each.",
    {
      code: z
        .string()
        .describe("Program code (e.g., 'COS-AB', 'FIN', 'AB')."),
      completedCourses: completedCoursesSchema,
    },
    async ({ code, completedCourses }) => {
      const found = lookupProgram(code);
      if (!found) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { found: false, code, message: `Program '${code}' not found.` },
                null,
                2
              ),
            },
          ],
        };
      }

      const studentCourses = toStudentCourses(completedCourses);
      const result = checkRequirements(found.node, studentCourses);
      const progress = quickProgress(found.node, studentCourses);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                program: { code: found.node.code, name: found.node.name, type: found.type },
                progress,
                requirements: result,
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
    "check_all_progress",
    "Check a student's progress toward their degree, major, and optionally minors/certificates all at once. Returns a summary for each program.",
    {
      degreeCode: z
        .enum(["AB", "BSE"])
        .describe("Degree type: 'AB' or 'BSE'."),
      majorCode: z
        .string()
        .describe("Major code (e.g., 'COS-AB', 'ECO', 'PHY')."),
      minorCodes: z
        .array(z.string())
        .optional()
        .describe("Minor codes (e.g., ['FIN', 'MAT'])."),
      certificateCodes: z
        .array(z.string())
        .optional()
        .describe("Certificate codes (e.g., ['QCB'])."),
      completedCourses: completedCoursesSchema,
    },
    async ({
      degreeCode,
      majorCode,
      minorCodes,
      certificateCodes,
      completedCourses,
    }) => {
      const data = getReqData();
      const studentCourses = toStudentCourses(completedCourses);

      const results: Record<
        string,
        { name: string; type: string; progress: ReturnType<typeof quickProgress>; satisfied: boolean }
      > = {};

      // Degree
      const degree = data.degrees.get(degreeCode);
      if (degree) {
        const p = quickProgress(degree, studentCourses);
        results[degreeCode] = { name: degree.name!, type: "Degree", progress: p, satisfied: p.satisfied === p.total };
      }

      // Major
      const major = lookupProgram(majorCode);
      if (major) {
        const p = quickProgress(major.node, studentCourses);
        results[majorCode] = { name: major.node.name!, type: "Major", progress: p, satisfied: p.satisfied === p.total };
      }

      // Minors
      for (const mc of minorCodes ?? []) {
        const minor = lookupProgram(mc);
        if (minor) {
          const p = quickProgress(minor.node, studentCourses);
          results[mc] = { name: minor.node.name!, type: "Minor", progress: p, satisfied: p.satisfied === p.total };
        }
      }

      // Certificates
      for (const cc of certificateCodes ?? []) {
        const cert = lookupProgram(cc);
        if (cert) {
          const p = quickProgress(cert.node, studentCourses);
          results[cc] = { name: cert.node.name!, type: "Certificate", progress: p, satisfied: p.satisfied === p.total };
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                totalCoursesCompleted: completedCourses.length,
                programs: results,
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
    "find_programs_near_completion",
    "Given a student's completed courses, find which minors and certificates they are closest to completing. Useful for discovering minors/certificates a student could easily add.",
    {
      completedCourses: completedCoursesSchema,
      maxRemaining: z
        .number()
        .optional()
        .describe(
          "Maximum number of remaining requirements to include in results (default 3). Programs needing more than this are excluded."
        ),
    },
    async ({ completedCourses, maxRemaining }) => {
      const threshold = maxRemaining ?? 3;
      const data = getReqData();
      const studentCourses = toStudentCourses(completedCourses);

      const results: Array<{
        code: string;
        name: string;
        type: string;
        satisfied: number;
        total: number;
        remaining: number;
        percentage: number;
      }> = [];

      for (const [code, node] of data.minors) {
        const p = quickProgress(node, studentCourses);
        const remaining = p.total - p.satisfied;
        if (remaining <= threshold) {
          results.push({
            code,
            name: node.name!,
            type: "Minor",
            ...p,
            remaining,
          });
        }
      }

      for (const [code, node] of data.certificates) {
        const p = quickProgress(node, studentCourses);
        const remaining = p.total - p.satisfied;
        if (remaining <= threshold) {
          results.push({
            code,
            name: node.name!,
            type: "Certificate",
            ...p,
            remaining,
          });
        }
      }

      results.sort((a, b) => a.remaining - b.remaining || b.percentage - a.percentage);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                threshold,
                count: results.length,
                programs: results,
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively format a RequirementNode tree for display (without checking). */
function formatTree(node: RequirementNode): Record<string, unknown> {
  const out: Record<string, unknown> = {
    name: node.name,
    minNeeded: node.minNeeded,
    maxCounted: node.maxCounted,
  };

  if (node.explanation) out.explanation = node.explanation;
  if (node.courseList) out.courseList = node.courseList;
  if (node.excludedCourseList) out.excludedCourseList = node.excludedCourseList;
  if (node.deptList) out.deptList = node.deptList;
  if (node.distReq) out.distReq = node.distReq;
  if (node.numCourses) out.numCourses = node.numCourses;
  if (node.completedBySemester < 8) out.completedBySemester = node.completedBySemester;
  if (node.doubleCountingAllowed) out.doubleCountingAllowed = true;
  if (node.noReq) out.noReq = true;

  if (node.reqList) {
    out.subrequirements = node.reqList.map((sub) => formatTree(sub));
  }

  return out;
}
