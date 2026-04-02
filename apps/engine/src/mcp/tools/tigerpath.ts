import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Pool } from "pg";
import { z } from "zod";
import {
  getRequirementTree,
  getDegreeTree,
  getRequirementNode,
  listAvailableMajors,
} from "../../tigerpath/requirements.js";
import type { AuthContext } from "../context.js";

const SEMESTER_LABELS = [
  "Freshman Fall",
  "Freshman Spring",
  "Sophomore Fall",
  "Sophomore Spring",
  "Junior Fall",
  "Junior Spring",
  "Senior Fall",
  "Senior Spring",
  "External Credits",
];

/**
 * Given a graduation year, return labels like "Freshman Fall (Fall 2024)" for each semester index.
 * Index 0 = first fall = (gradYear - 4) fall.
 */
function semesterLabelsForYear(gradYear: number): string[] {
  const startYear = gradYear - 4;
  return [
    `Freshman Fall (Fall ${startYear})`,
    `Freshman Spring (Spring ${startYear + 1})`,
    `Sophomore Fall (Fall ${startYear + 1})`,
    `Sophomore Spring (Spring ${startYear + 2})`,
    `Junior Fall (Fall ${startYear + 2})`,
    `Junior Spring (Spring ${startYear + 3})`,
    `Senior Fall (Fall ${startYear + 3})`,
    `Senior Spring (Spring ${startYear + 4})`,
    `External Credits`,
  ];
}

/**
 * Resolve a semester name like "Sophomore Fall", "Fall 2025", or "sophomore fall" to a semester index.
 * Requires the user's graduation year to map absolute terms.
 */
function resolveSemesterName(name: string, gradYear: number): number | null {
  const lower = name.toLowerCase().trim();

  // Direct label match: "freshman fall", "junior spring", etc.
  const directIdx = SEMESTER_LABELS.findIndex((l) => l.toLowerCase() === lower);
  if (directIdx !== -1) return directIdx;

  // "external" / "external credits"
  if (lower.includes("external")) return 8;

  // Absolute term: "Fall 2025", "Spring 2026"
  const absMatch = lower.match(/^(fall|spring)\s+(\d{4})$/);
  if (absMatch) {
    const season = absMatch[1];
    const termYear = parseInt(absMatch[2]);
    const startYear = gradYear - 4;
    // Index 0 = Fall startYear, 1 = Spring startYear+1, 2 = Fall startYear+1, ...
    for (let i = 0; i < 8; i++) {
      const isFall = i % 2 === 0;
      const yr = startYear + Math.floor(i / 2) + (isFall ? 0 : 1);
      if ((isFall ? "fall" : "spring") === season && yr === termYear) return i;
    }
    return null;
  }

  return null;
}

function textResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function errorResult(msg: string) {
  return { content: [{ type: "text" as const, text: JSON.stringify({ error: msg }) }], isError: true as const };
}

// ── User resolution ─────────────────────────────────────────────────────────

async function resolveTigerpathUser(pool: Pool, netid: string) {
  const userRes = await pool.query(
    "SELECT id FROM auth_user WHERE username = $1",
    [netid]
  );
  if (userRes.rows.length === 0) return null;
  const userId = userRes.rows[0].id;

  const profileRes = await pool.query(
    `SELECT up.id, up.user_schedule, up.year, up.major_id, m.code AS major_code, m.name AS major_name
     FROM tigerpath_userprofile up
     LEFT JOIN tigerpath_major m ON up.major_id = m.id
     WHERE up.user_id = $1`,
    [userId]
  );
  if (profileRes.rows.length === 0) return null;
  return { userId, ...profileRes.rows[0] };
}

// ── Course resolution ───────────────────────────────────────────────────────

async function resolveRegistrarId(pool: Pool, dept: string, number: string): Promise<string[]> {
  const res = await pool.query(
    `SELECT DISTINCT c.registrar_id
     FROM tigerpath_course c
     JOIN tigerpath_course_listing cl ON cl.course_id = c.id
     WHERE UPPER(cl.dept) = UPPER($1) AND cl.number = $2`,
    [dept, number]
  );
  return res.rows.map((r: any) => r.registrar_id);
}

async function enrichSchedule(pool: Pool, schedule: any[]): Promise<any[]> {
  const enriched: any[] = [];
  for (let i = 0; i < schedule.length; i++) {
    const sem = schedule[i];
    if (!Array.isArray(sem)) { enriched.push([]); continue; }
    const courses: any[] = [];
    for (const c of sem) {
      if (typeof c !== "object" || !c) continue;
      if (c.external) {
        courses.push({ id: c.id, name: c.name || "External Credit", external: true });
        continue;
      }
      const res = await pool.query(
        `SELECT c.title, c.dist_area, c.cross_listings, cl.dept, cl.number
         FROM tigerpath_course c
         JOIN tigerpath_course_listing cl ON cl.course_id = c.id AND cl.is_primary = true
         WHERE c.registrar_id = $1
         LIMIT 1`,
        [c.id]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        courses.push({
          id: c.id,
          code: `${row.dept} ${row.number}`,
          title: row.title,
          dist_area: row.dist_area || null,
          cross_listings: row.cross_listings || null,
        });
      } else {
        courses.push({ id: c.id, code: "Unknown", title: "Unknown course" });
      }
    }
    enriched.push(courses);
  }
  return enriched;
}

// ── Tool registration ───────────────────────────────────────────────────────

export function registerTigerpathTools(
  server: McpServer,
  pool: Pool | undefined,
  authContext?: AuthContext
) {
  // ── Requirements tools (no DB needed) ───────────────────────────────────

  server.tool(
    "get_requirement_tree",
    "Get the full degree requirement tree for a Princeton major. Returns the hierarchical requirement structure with course lists, distribution requirements, and min/max counts. Use this to understand what courses are needed for a major.",
    {
      major: z.string().describe("Major code (e.g., 'COS-BSE', 'ECO', 'MAT'). Use list_majors to see all available codes."),
      year: z.number().describe("Class year (graduation year, e.g., 2026). Affects which requirements apply via year-specific switches."),
    },
    async ({ major, year }) => {
      const tree = getRequirementTree(major, year);
      if (!tree) {
        const available = listAvailableMajors();
        return errorResult(`Major '${major}' not found. Available: ${available.join(", ")}`);
      }
      return textResult(tree);
    }
  );

  server.tool(
    "get_requirement_node",
    "Get a specific subtree of a major's requirements by path. Useful for drilling into a particular requirement category like 'Core Courses' or 'Electives'.",
    {
      major: z.string().describe("Major code (e.g., 'COS-BSE')"),
      year: z.number().describe("Class year (graduation year)"),
      path: z.string().describe("Path suffix to match (e.g., 'Core Courses', 'Core Courses//Theoretical Computer Science'). Uses '//' as separator."),
    },
    async ({ major, year, path: pathSuffix }) => {
      const node = getRequirementNode(major, year, pathSuffix);
      if (!node) return errorResult(`Requirement node not found for path '${pathSuffix}' in ${major}`);
      return textResult(node);
    }
  );

  // ── Analytics tools (read-only DB) ──────────────────────────────────────

  if (!pool) return;

  server.tool(
    "course_timing_distribution",
    "Shows when students typically take a course in their 4-year plan. Returns a distribution across semesters (Freshman Fall through Senior Spring). Answer questions like 'When do most people take COS 226?'",
    {
      dept: z.string().describe("Department code (e.g., 'COS', 'MAT')"),
      number: z.string().describe("Course number (e.g., '226', '201')"),
    },
    async ({ dept, number }) => {
      const registrarIds = await resolveRegistrarId(pool, dept, number);
      if (registrarIds.length === 0) return errorResult(`Course ${dept} ${number} not found`);

      const res = await pool.query(
        `SELECT arr.idx - 1 AS semester_index, COUNT(*)::int AS student_count
         FROM tigerpath_userprofile p,
              jsonb_array_elements(p.user_schedule) WITH ORDINALITY arr(semester, idx),
              jsonb_array_elements(arr.semester) course
         WHERE course->>'id' = ANY($1)
           AND p.year IS NOT NULL
           AND arr.idx <= 9
         GROUP BY arr.idx
         ORDER BY arr.idx`,
        [registrarIds]
      );

      const distribution: Record<string, number> = {};
      let total = 0;
      for (const row of res.rows) {
        const label = SEMESTER_LABELS[row.semester_index] ?? `Semester ${row.semester_index}`;
        distribution[label] = row.student_count;
        total += row.student_count;
      }

      return textResult({ course: `${dept.toUpperCase()} ${number}`, total_students: total, distribution });
    }
  );

  server.tool(
    "major_schedule_overview",
    "Shows the most popular courses per semester for students in a given major. Useful for understanding a typical 4-year plan for a major.",
    {
      major_code: z.string().describe("Major code (e.g., 'COS-BSE', 'ECO')"),
      top_n: z.number().optional().describe("Number of top courses per semester (default 5)"),
    },
    async ({ major_code, top_n }) => {
      const limit = top_n ?? 5;

      const res = await pool.query(
        `WITH major_schedules AS (
           SELECT p.user_schedule
           FROM tigerpath_userprofile p
           JOIN tigerpath_major m ON p.major_id = m.id
           WHERE m.code = $1 AND p.user_schedule IS NOT NULL
         ),
         exploded AS (
           SELECT arr.idx - 1 AS sem_idx, course->>'id' AS registrar_id
           FROM major_schedules ms,
                jsonb_array_elements(ms.user_schedule) WITH ORDINALITY arr(semester, idx),
                jsonb_array_elements(arr.semester) course
           WHERE arr.idx <= 9
         ),
         counted AS (
           SELECT sem_idx, registrar_id, COUNT(*)::int AS cnt
           FROM exploded
           GROUP BY sem_idx, registrar_id
         ),
         ranked AS (
           SELECT sem_idx, registrar_id, cnt,
                  ROW_NUMBER() OVER (PARTITION BY sem_idx ORDER BY cnt DESC) AS rn
           FROM counted
         )
         SELECT r.sem_idx, r.registrar_id, r.cnt,
                cl.dept, cl.number, c.title
         FROM ranked r
         LEFT JOIN tigerpath_course c ON c.registrar_id = r.registrar_id
         LEFT JOIN tigerpath_course_listing cl ON cl.course_id = c.id AND cl.is_primary = true
         WHERE r.rn <= $2
         ORDER BY r.sem_idx, r.cnt DESC`,
        [major_code, limit]
      );

      const semesters: Record<string, any[]> = {};
      for (const row of res.rows) {
        const label = SEMESTER_LABELS[row.sem_idx] ?? `Semester ${row.sem_idx}`;
        if (!semesters[label]) semesters[label] = [];
        semesters[label].push({
          course: row.dept && row.number ? `${row.dept} ${row.number}` : row.registrar_id,
          title: row.title || "Unknown",
          students: row.cnt,
        });
      }

      return textResult({ major: major_code, semesters });
    }
  );

  server.tool(
    "course_popularity",
    "Shows how many students have a course in their plan, broken down by major. Answers questions like 'How popular is COS 126?' or 'Which majors take ORF 309?'",
    {
      dept: z.string().describe("Department code (e.g., 'COS')"),
      number: z.string().describe("Course number (e.g., '126')"),
    },
    async ({ dept, number }) => {
      const registrarIds = await resolveRegistrarId(pool, dept, number);
      if (registrarIds.length === 0) return errorResult(`Course ${dept} ${number} not found`);

      const res = await pool.query(
        `SELECT m.code AS major_code, m.name AS major_name, COUNT(DISTINCT p.id)::int AS student_count
         FROM tigerpath_userprofile p
         LEFT JOIN tigerpath_major m ON p.major_id = m.id,
              jsonb_array_elements(p.user_schedule) semester,
              jsonb_array_elements(semester) course
         WHERE course->>'id' = ANY($1)
         GROUP BY m.code, m.name
         ORDER BY student_count DESC`,
        [registrarIds]
      );

      const total = res.rows.reduce((sum: number, r: any) => sum + r.student_count, 0);
      return textResult({
        course: `${dept.toUpperCase()} ${number}`,
        total_students: total,
        by_major: res.rows.map((r: any) => ({
          major: r.major_code || "Undeclared",
          name: r.major_name || "Undeclared",
          students: r.student_count,
        })),
      });
    }
  );

  server.tool(
    "get_major_stats",
    "Returns aggregate statistics about TigerPath users: student count per major and class year distribution.",
    {},
    async () => {
      const majorRes = await pool.query(
        `SELECT m.code, m.name, m.degree, COUNT(*)::int AS students
         FROM tigerpath_userprofile p
         JOIN tigerpath_major m ON p.major_id = m.id
         GROUP BY m.code, m.name, m.degree
         ORDER BY students DESC`
      );

      const yearRes = await pool.query(
        `SELECT year, COUNT(*)::int AS students
         FROM tigerpath_userprofile
         WHERE year IS NOT NULL
         GROUP BY year
         ORDER BY year DESC
         LIMIT 10`
      );

      return textResult({
        total_users: majorRes.rows.reduce((s: number, r: any) => s + r.students, 0),
        by_major: majorRes.rows,
        by_year: yearRes.rows,
      });
    }
  );

  // ── User schedule tools (auth required) ─────────────────────────────────

  server.tool(
    "get_user_schedule",
    "Get the authenticated TigerPath user's 4-year course plan. Returns 9 semesters with actual term labels (e.g., 'Sophomore Fall (Fall 2025)') and enriched course data. Requires x-user-netid header.",
    {},
    async () => {
      const netid = authContext?.netid;
      if (!netid) return errorResult("Authentication required. Provide x-user-netid header.");

      const user = await resolveTigerpathUser(pool, netid);
      if (!user) return errorResult(`TigerPath user not found for NetID '${netid}'.`);

      const schedule = user.user_schedule || Array.from({ length: 9 }, () => []);
      const enriched = await enrichSchedule(pool, schedule);

      const labels = user.year ? semesterLabelsForYear(user.year) : SEMESTER_LABELS;
      const semesters: Record<string, any[]> = {};
      for (let i = 0; i < enriched.length; i++) {
        semesters[labels[i] ?? `Semester ${i}`] = enriched[i];
      }

      return textResult({
        netid,
        class_year: user.year,
        major: user.major_code ? { code: user.major_code, name: user.major_name } : null,
        semesters,
      });
    }
  );

  server.tool(
    "update_user_schedule",
    "Add or remove courses from the authenticated user's TigerPath schedule. Specify the semester by name (e.g., 'Sophomore Fall', 'Fall 2025', 'Junior Spring'). The tool resolves the correct position using the user's class year. Requires x-user-netid header.",
    {
      semester: z.string().describe("Semester name — either relative (e.g., 'Sophomore Fall', 'Junior Spring', 'External Credits') or absolute (e.g., 'Fall 2025', 'Spring 2026'). Resolved to the correct position using the user's graduation year."),
      action: z.enum(["add", "remove"]).describe("Whether to add or remove the course"),
      dept: z.string().describe("Department code (e.g., 'COS')"),
      number: z.string().describe("Course number (e.g., '226')"),
    },
    async ({ semester, action, dept, number }) => {
      const netid = authContext?.netid;
      if (!netid) return errorResult("Authentication required. Provide x-user-netid header.");

      const user = await resolveTigerpathUser(pool, netid);
      if (!user) return errorResult(`TigerPath user not found for NetID '${netid}'.`);

      if (!user.year) return errorResult("User's class year is not set in TigerPath. Cannot resolve semester.");

      const semesterIndex = resolveSemesterName(semester, user.year);
      if (semesterIndex === null) {
        const labels = semesterLabelsForYear(user.year);
        return errorResult(`Could not resolve semester '${semester}'. Valid options: ${labels.join(", ")}`);
      }

      const userSchedule: any[][] = user.user_schedule || Array.from({ length: 9 }, () => []);
      while (userSchedule.length < 9) userSchedule.push([]);

      const registrarIds = await resolveRegistrarId(pool, dept, number);
      if (registrarIds.length === 0) return errorResult(`Course ${dept} ${number} not found in TigerPath catalog`);
      const registrarId = registrarIds[0];

      const labels = semesterLabelsForYear(user.year);

      if (action === "add") {
        for (let i = 0; i < userSchedule.length; i++) {
          if (Array.isArray(userSchedule[i])) {
            for (const c of userSchedule[i]) {
              if (typeof c === "object" && c?.id === registrarId) {
                return errorResult(`${dept} ${number} is already in ${labels[i]}`);
              }
            }
          }
        }
        userSchedule[semesterIndex].push({ id: registrarId, settled: [] });
      } else {
        const idx = userSchedule[semesterIndex].findIndex(
          (c: any) => typeof c === "object" && c?.id === registrarId
        );
        if (idx === -1) return errorResult(`${dept} ${number} not found in ${labels[semesterIndex]}`);
        userSchedule[semesterIndex].splice(idx, 1);
      }

      await pool.query(
        `UPDATE tigerpath_userprofile SET user_schedule = $1
         FROM auth_user
         WHERE tigerpath_userprofile.user_id = auth_user.id AND auth_user.username = $2`,
        [JSON.stringify(userSchedule), netid]
      );

      return textResult({
        success: true,
        action,
        course: `${dept.toUpperCase()} ${number}`,
        semester: labels[semesterIndex],
      });
    }
  );
}
