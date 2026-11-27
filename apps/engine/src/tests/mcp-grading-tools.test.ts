import { describe, expect, test } from "bun:test";
import { McpServer } from "@modelcontextprotocol/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { registerJunctionScheduleTools } from "../mcp/tools/junction-schedules.js";
import { registerCourseTools } from "../mcp/tools/courses.js";

interface MockSupabaseCourse {
  id: number;
  listing_id: string;
  code: string;
  term: number;
  status: number;
}

interface MockSupabaseSection {
  course_id: number;
  title: string;
  days: number;
  start_time: number; // ReCal 10-minute units since 8:00 AM (e.g., 12 = 10:00 AM)
  end_time: number;
  status: number;
  cap: number;
  tot: number;
}

function createMockSupabase(
  courses: MockSupabaseCourse[],
  sections: MockSupabaseSection[]
): SupabaseClient {
  return {
    from(table: string) {
      let orFilter: string | null = null;
      let termFilter: number | null = null;
      let courseIdFilter: number | null = null;

      const builder = {
        select() {
          return builder;
        },
        or(expr: string) {
          orFilter = expr;
          return builder;
        },
        eq(col: string, val: unknown) {
          if (col === "term") termFilter = Number(val);
          if (col === "course_id") courseIdFilter = Number(val);
          return builder;
        },
        order() {
          return builder;
        },
        async limit(n: number) {
          if (table === "courses") {
            let rows = [...courses];
            if (termFilter != null) rows = rows.filter((c) => c.term === termFilter);
            if (orFilter) {
              const needles = [...orFilter.matchAll(/code\.ilike\.([^,]+)/g)].map((m) =>
                m[1].toLowerCase()
              );
              rows = rows.filter((c) => needles.includes(c.code.toLowerCase()));
            }
            return { data: rows.slice(0, n), error: null };
          }
          return { data: [], error: null };
        },
        then(resolve: (value: { data: unknown[]; error: null }) => void) {
          if (table === "sections") {
            const rows =
              courseIdFilter != null
                ? sections.filter((s) => s.course_id === courseIdFilter)
                : sections;
            resolve({ data: rows, error: null });
            return;
          }
          resolve({ data: [], error: null });
        },
      };
      return builder;
    },
  } as unknown as SupabaseClient;
}

function createMockEngineDb(
  gradingRows: {
    id: string;
    gradingKnown: boolean;
    examPct: number | null;
    psetPct: number | null;
    hasFinal: boolean | null;
    detailsJson: unknown;
  }[]
): NodePgDatabase {
  return {
    select() {
      return {
        from() {
          return {
            async where() {
              return gradingRows;
            },
          };
        },
      };
    },
  } as unknown as NodePgDatabase;
}

type RegisteredToolMap = Record<
  string,
  {
    inputSchema?: { shape?: Record<string, unknown> };
    handler: (args: Record<string, unknown>) => Promise<{
      content: { type: string; text: string }[];
      isError?: boolean;
    }>;
  }
>;

function getRegisteredTools(server: McpServer): RegisteredToolMap {
  return (server as unknown as { _registeredTools: RegisteredToolMap })._registeredTools;
}

describe("MCP grading & solver tool registration", () => {
  test("search_courses exposes grading and review filter inputs", () => {
    const server = new McpServer({ name: "test", version: "1.0.0" });
    registerCourseTools(server, createMockEngineDb([]));
    const tools = getRegisteredTools(server);

    const searchShape = tools.search_courses.inputSchema?.shape ?? {};
    expect(Object.keys(searchShape)).toEqual(
      expect.arrayContaining([
        "maxExamPct",
        "minPsetPct",
        "excludeUnknownGrading",
        "minRating",
        "reviewKeyword",
      ])
    );

    expect(tools.get_course_details).toBeDefined();
    expect(tools.discover_courses).toBeDefined();
    expect(tools.compare_courses).toBeDefined();
  });

  test("junction verify_schedule converts ReCal 10-minute times, detects 3-way conflicts, and enriches grading", async () => {
    // ReCal 10-minute units: 12 = 10:00 AM, 18 = 11:00 AM, 24 = 12:00 PM
    const M_W = 1 | 4;
    const T_TH = 2 | 8;

    const mockSupabase = createMockSupabase(
      [
        { id: 1, listing_id: "001001", code: "COS301", term: 1274, status: 0 },
        { id: 2, listing_id: "001002", code: "MAT302", term: 1274, status: 0 },
        { id: 3, listing_id: "001003", code: "ORF303", term: 1274, status: 0 },
        { id: 4, listing_id: "001004", code: "COS318", term: 1274, status: 0 },
        { id: 5, listing_id: "001005", code: "ECO310", term: 1274, status: 0 },
      ],
      [
        // 3 courses competing for the same 2 MW time slots (pigeonhole conflict)
        {
          course_id: 1,
          title: "L01",
          days: M_W,
          start_time: 12,
          end_time: 18,
          status: 0,
          cap: 50,
          tot: 20,
        },
        {
          course_id: 1,
          title: "L02",
          days: M_W,
          start_time: 18,
          end_time: 24,
          status: 0,
          cap: 50,
          tot: 20,
        },
        {
          course_id: 2,
          title: "L01",
          days: M_W,
          start_time: 12,
          end_time: 18,
          status: 0,
          cap: 50,
          tot: 20,
        },
        {
          course_id: 2,
          title: "L02",
          days: M_W,
          start_time: 18,
          end_time: 24,
          status: 0,
          cap: 50,
          tot: 20,
        },
        {
          course_id: 3,
          title: "L01",
          days: M_W,
          start_time: 12,
          end_time: 18,
          status: 0,
          cap: 50,
          tot: 20,
        },
        {
          course_id: 3,
          title: "L02",
          days: M_W,
          start_time: 18,
          end_time: 24,
          status: 0,
          cap: 50,
          tot: 20,
        },
        // Candidate courses on TTh
        {
          course_id: 4,
          title: "L01",
          days: T_TH,
          start_time: 12,
          end_time: 18,
          status: 0,
          cap: 40,
          tot: 10,
        },
        {
          course_id: 5,
          title: "L01",
          days: T_TH,
          start_time: 18,
          end_time: 24,
          status: 0,
          cap: 40,
          tot: 10,
        },
      ]
    );

    const mockDb = createMockEngineDb([
      {
        id: "001001-1274",
        gradingKnown: true,
        examPct: 20,
        psetPct: 80,
        hasFinal: false,
        detailsJson: null,
      },
      {
        id: "001002-1274",
        gradingKnown: true,
        examPct: 50,
        psetPct: 50,
        hasFinal: true,
        detailsJson: null,
      },
      {
        id: "001004-1274",
        gradingKnown: true,
        examPct: 0,
        psetPct: 100,
        hasFinal: false,
        detailsJson: null,
      },
      {
        id: "001005-1274",
        gradingKnown: true,
        examPct: 80,
        psetPct: 20,
        hasFinal: true,
        detailsJson: null,
      },
    ]);

    const server = new McpServer({ name: "test", version: "1.0.0" });
    registerJunctionScheduleTools(server, mockSupabase, undefined, mockDb);
    const verify = getRegisteredTools(server).verify_schedule;

    // 1) 3-way pigeonhole conflict must fail
    const conflictRes = await verify.handler({
      courseCodes: ["COS 301", "MAT 302", "ORF 303"],
      term: 1274,
    });
    const conflictPayload = JSON.parse(conflictRes.content[0].text);
    expect(conflictPayload.valid).toBe(false);
    expect(conflictPayload.feasibleCombinations).toEqual([]);

    // 2) Valid 2-course core + candidate pool ranked by lowest exam load + ReCal time conversion
    const candidateRes = await verify.handler({
      courseCodes: ["COS 301", "MAT 302"],
      candidateCodes: ["ECO 310", "COS 318"],
      targetCourseCount: 3,
      maxCourseExamPct: 50,
      term: 1274,
    });
    const payload = JSON.parse(candidateRes.content[0].text);
    expect(payload.valid).toBe(true);
    expect(payload.gradingLoad.avgExamPct).toBe(35);
    expect(payload.feasibleCombinations[0][0].meetings[0].startTime).toBe("10:00 AM");
    expect(payload.proposedSchedules).toHaveLength(1);
    expect(payload.proposedSchedules[0].courseCodes).toEqual(["COS301", "MAT302", "COS318"]);
    expect(payload.proposedSchedules[0].gradingLoad.avgExamPct).toBe(23);
  });
});
