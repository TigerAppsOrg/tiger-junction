import { describe, expect, test } from "bun:test";
import {
  evaluateProposedSchedule,
  solveCandidateSchedules,
  solveCourseSet,
  summarizeScheduleGradingLoad,
  type ResolvedScheduleCourse,
  type SolverCourseInput,
} from "../mcp/schedule-solver.js";

// Bitmask helpers: M=1, T=2, W=4, Th=8, F=16
// Time helpers: minutes since 8:00 AM (10:00 AM = 120, 11:00 AM = 180, 1:30 PM = 330)
const M = 1;
const T = 2;
const W = 4;
const TH = 8;
const F = 16;

describe("solveCourseSet global backtracking", () => {
  test("catches 3-way pigeonhole conflicts missed by pairwise checks", () => {
    const slot1 = { days: M | W, startTime: 120, endTime: 180 }; // MW 10:00-11:00
    const slot2 = { days: M | W, startTime: 180, endTime: 240 }; // MW 11:00-12:00

    const courses: SolverCourseInput[] = [
      {
        code: "COS 301",
        sections: [
          { title: "L01", status: "open", ...slot1 },
          { title: "L02", status: "open", ...slot2 },
        ],
      },
      {
        code: "MAT 302",
        sections: [
          { title: "L01", status: "open", ...slot1 },
          { title: "L02", status: "open", ...slot2 },
        ],
      },
      {
        code: "ORF 303",
        sections: [
          { title: "L01", status: "open", ...slot1 },
          { title: "L02", status: "open", ...slot2 },
        ],
      },
    ];

    const res = solveCourseSet(courses);
    expect(res.feasible).toBe(false);
    expect(res.solutions).toEqual([]);
    expect(res.blockingCourse).not.toBeNull();
    expect(res.blockingSectionType).toBe("L");
  });

  test("finds exact conflict-free section combinations across lectures and precepts", () => {
    const courses: SolverCourseInput[] = [
      {
        code: "COS 226",
        sections: [
          { title: "L01", status: "open", days: M | W, startTime: 120, endTime: 170 },
          { title: "P01", status: "open", days: TH, startTime: 120, endTime: 170 },
          { title: "P02", status: "open", days: F, startTime: 120, endTime: 170 },
        ],
      },
      {
        code: "MAT 202",
        sections: [
          { title: "L01", status: "open", days: T | TH, startTime: 120, endTime: 170 },
          { title: "C01", status: "open", days: M | W, startTime: 180, endTime: 230 },
        ],
      },
    ];

    const res = solveCourseSet(courses);
    expect(res.feasible).toBe(true);
    expect(res.solutions).toHaveLength(1);
    const picked = res.solutions[0];
    const cosPrecept = picked.find((p) => p.courseCode === "COS 226" && p.type === "P");
    expect(cosPrecept?.section).toBe("P02");
  });

  test("bundles multi-meeting rows sharing the same section title atomically", () => {
    const courses: SolverCourseInput[] = [
      {
        code: "PHY 104",
        sections: [
          // Single section L01 meets both Mon 10-11 and Wed 1:30-2:30
          { title: "L01", status: "open", days: M, startTime: 120, endTime: 180 },
          { title: "L01", status: "open", days: W, startTime: 330, endTime: 390 },
        ],
      },
      {
        code: "ECO 100",
        sections: [
          // L01 overlaps PHY 104 L01's SECOND meeting on Wed 1:30-2:30
          { title: "L01", status: "open", days: W, startTime: 330, endTime: 390 },
          // L02 is completely conflict-free
          { title: "L02", status: "open", days: T, startTime: 120, endTime: 180 },
        ],
      },
    ];

    const res = solveCourseSet(courses);
    expect(res.feasible).toBe(true);
    expect(res.solutions).toHaveLength(1);
    const ecoPick = res.solutions[0].find((p) => p.courseCode === "ECO 100");
    expect(ecoPick?.section).toBe("L02");
    const phyPick = res.solutions[0].find((p) => p.courseCode === "PHY 104");
    expect(phyPick?.meetings).toHaveLength(2);
  });

  test("handles TBA/unscheduled meetings without false conflicts and flags them", () => {
    const courses: SolverCourseInput[] = [
      {
        code: "MUS 210",
        sections: [{ title: "S01", status: "open", days: 0, startTime: -420, endTime: -420 }],
      },
      {
        code: "COS 324",
        sections: [{ title: "L01", status: "open", days: M | W, startTime: 120, endTime: 180 }],
      },
    ];

    const res = solveCourseSet(courses);
    expect(res.feasible).toBe(true);
    expect(res.hasUnscheduledSections).toBe(true);
  });

  test("enforces requireOpen, earliestStart, latestEnd, and avoidDaysMask", () => {
    const courses: SolverCourseInput[] = [
      {
        code: "COS 333",
        sections: [
          { title: "L01", status: "closed", days: M | W, startTime: 180, endTime: 240 },
          { title: "L02", status: "open", days: F, startTime: 60, endTime: 120 }, // Fri 9-10 AM
          { title: "L03", status: "open", days: T | TH, startTime: 180, endTime: 240 }, // TTh 11-12
        ],
      },
    ];

    const openNoFriday = solveCourseSet(courses, {
      requireOpen: true,
      avoidDaysMask: F,
      earliestStart: 120, // 10:00 AM
      latestEnd: 300, // 1:00 PM
    });
    expect(openNoFriday.feasible).toBe(true);
    expect(openNoFriday.solutions).toHaveLength(1);
    expect(openNoFriday.solutions[0][0].section).toBe("L03");

    const impossible = solveCourseSet(courses, {
      requireOpen: true,
      earliestStart: 300, // 1:00 PM
    });
    expect(impossible.feasible).toBe(false);
  });
});

describe("solveCandidateSchedules & evaluateProposedSchedule", () => {
  const required: ResolvedScheduleCourse[] = [
    {
      code: "COS 226",
      term: 1274,
      status: "open",
      grading: { known: true, examPct: 40, psetPct: 60 },
      sections: [{ title: "L01", status: "open", days: M | W, startTime: 120, endTime: 180 }],
    },
  ];

  const candidates: ResolvedScheduleCourse[] = [
    {
      code: "COS 432", // 0% exam, conflicts with COS 226
      term: 1274,
      status: "open",
      grading: { known: true, examPct: 0, psetPct: 100 },
      sections: [{ title: "L01", status: "open", days: M | W, startTime: 120, endTime: 180 }],
    },
    {
      code: "COS 318", // 0% exam, fits cleanly on TTh
      term: 1274,
      status: "open",
      grading: { known: true, examPct: 0, psetPct: 100 },
      sections: [{ title: "L01", status: "open", days: T | TH, startTime: 120, endTime: 180 }],
    },
    {
      code: "ECO 310", // 80% exam, fits on TTh
      term: 1274,
      status: "open",
      grading: { known: true, examPct: 80, psetPct: 20 },
      sections: [{ title: "L01", status: "open", days: T | TH, startTime: 240, endTime: 300 }],
    },
    {
      code: "HIS 380", // Unknown grading, fits on Fri
      term: 1274,
      status: "open",
      grading: { known: false, examPct: null, psetPct: null },
      sections: [{ title: "S01", status: "open", days: F, startTime: 180, endTime: 300 }],
    },
  ];

  test("ranks conflict-free semesters by open seats and lowest confirmed exam load", () => {
    const proposals = solveCandidateSchedules(required, candidates, {
      targetCourseCount: 2,
      maxCourseExamPct: 50,
      maxSchedules: 5,
    });

    // COS 432 conflicts; ECO 310 exceeds maxCourseExamPct=50.
    // Remaining: COS 318 (known 0% exam, avg 20%) should rank ahead of HIS 380 (unknown grading, avg 40%).
    expect(proposals.map((p) => p.courseCodes)).toEqual([
      ["COS 226", "COS 318"],
      ["COS 226", "HIS 380"],
    ]);
    expect(proposals[0].gradingLoad.avgExamPct).toBe(20);
    expect(proposals[0].gradingLoad.unknownCount).toBe(0);
    expect(proposals[1].gradingLoad.unknownCount).toBe(1);
  });

  test("summarizeScheduleGradingLoad separates known vs unknown courses", () => {
    const load = summarizeScheduleGradingLoad([required[0], candidates[3]]);
    expect(load.knownCount).toBe(1);
    expect(load.unknownCount).toBe(1);
    expect(load.avgExamPct).toBe(40);
    expect(load.avgPsetPct).toBe(60);
    expect(load.maxExamPct).toBe(40);
  });

  test("evaluateProposedSchedule returns valid report, feasible combinations, and proposed schedules", () => {
    const result = evaluateProposedSchedule({
      requiredCourses: required,
      candidateCourses: candidates,
      initialIssues: [],
      args: {
        courseCodes: ["COS 226"],
        candidateCodes: ["COS 432", "COS 318", "ECO 310", "HIS 380"],
        targetCourseCount: 2,
        maxCourseExamPct: 25,
        avoidDays: "F",
      },
    });

    expect(result.valid).toBe(true);
    expect(result.feasibleCombinations).toHaveLength(1);
    expect(result.gradingLoad.avgExamPct).toBe(40);
    // avoidDays: "F" eliminates HIS 380; maxCourseExamPct: 25 eliminates ECO 310; COS 432 conflicts.
    expect(result.proposedSchedules?.map((p) => p.courseCodes)).toEqual([["COS 226", "COS 318"]]);
  });

  test("evaluateProposedSchedule reports invalid time/day constraint formats cleanly", () => {
    const result = evaluateProposedSchedule({
      requiredCourses: required,
      initialIssues: [],
      args: {
        courseCodes: ["COS 226"],
        earliestStart: "not-a-time",
        avoidDays: "XYZ",
      },
    });
    expect(result.valid).toBe(false);
    expect(Array.isArray(result.issues)).toBe(true);
    const issueList = result.issues as string[];
    expect(issueList.some((i) => i.includes("Invalid earliestStart"))).toBe(true);
    expect(issueList.some((i) => i.includes("Invalid avoidDays"))).toBe(true);
  });
});
