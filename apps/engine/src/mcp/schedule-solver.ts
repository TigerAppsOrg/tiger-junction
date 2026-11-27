import { z } from "zod";
import { daysToBitmask, termCodeToName, timeToValue, valueToDays, valueToTime } from "./helpers.js";

const NULL_TIME = -420;

export interface SolverMeeting {
  days: number;
  /** Canonical minutes since 8:00 AM (-420 means TBA / unscheduled). */
  startTime: number;
  /** Canonical minutes since 8:00 AM (-420 means TBA / unscheduled). */
  endTime: number;
}

export interface SolverSectionRow extends SolverMeeting {
  title: string;
  type?: string;
  status: string;
  cap?: number;
  tot?: number;
  room?: string | null;
}

export interface SolverCourseInput {
  code: string;
  status?: string;
  sections: SolverSectionRow[];
  grading?: {
    known: boolean;
    examPct: number | null;
    psetPct: number | null;
  };
}

export interface ResolvedScheduleCourse extends SolverCourseInput {
  term: number;
  status: string;
}

export interface GroupedSectionChoice {
  courseCode: string;
  type: string;
  title: string;
  status: string;
  cap: number;
  tot: number;
  meetings: SolverMeeting[];
  hasUnscheduledMeetings: boolean;
}

export interface FormattedSectionPick {
  courseCode: string;
  type: string;
  section: string;
  status: string;
  enrolled: number;
  capacity: number;
  meetings: { days: string[]; startTime: string; endTime: string }[];
  hasUnscheduledMeetings: boolean;
}

export interface SolvedCourseSetResult {
  feasible: boolean;
  solutions: FormattedSectionPick[][];
  hasUnscheduledSections: boolean;
  blockingCourse: string | null;
  blockingSectionType: string | null;
  truncated: boolean;
}

export interface SolveOptions {
  requireOpen?: boolean;
  /** Earliest allowed start time in minutes since 8:00 AM. */
  earliestStart?: number;
  /** Latest allowed end time in minutes since 8:00 AM. */
  latestEnd?: number;
  /** Bitmask of disallowed weekdays (M=1, T=2, W=4, Th=8, F=16). */
  avoidDaysMask?: number;
  maxSolutions?: number;
  maxNodes?: number;
}

export interface ScheduleGradingLoad {
  knownCount: number;
  unknownCount: number;
  avgExamPct: number | null;
  avgPsetPct: number | null;
  maxExamPct: number | null;
  perCourse: {
    code: string;
    gradingKnown: boolean;
    examPct: number | null;
    psetPct: number | null;
  }[];
}

export interface CandidateScheduleProposal {
  courseCodes: string[];
  sections: FormattedSectionPick[];
  gradingLoad: ScheduleGradingLoad;
  allSelectedSectionsOpen: boolean;
  distinctClassDays: number;
  hasUnscheduledSections: boolean;
}

export interface CandidateSolveOptions extends SolveOptions {
  targetCourseCount: number;
  maxCourseExamPct?: number;
  maxAvgExamPct?: number;
  maxSchedules?: number;
}

export const VERIFY_SCHEDULE_DESCRIPTION =
  "Validate a proposed schedule of courses using a global backtracking section solver (proves a conflict-free combination of all required lectures, precepts, labs, and multi-meeting sections). Also checks mixed terms, closed/canceled sections, duplicates, and exam/pset grading load. Optionally pass candidateCodes + targetCourseCount to solve complete conflict-free semesters ranked by open seats and lowest exam load.";

export const verifyScheduleInputSchema = z.object({
  courseCodes: z
    .array(z.string())
    .min(1)
    .max(10)
    .describe(
      "Array of required course codes to validate together (e.g., ['COS 226', 'MAT 202', 'ECO 100'])"
    ),
  term: z
    .number()
    .optional()
    .describe("Term code. If omitted, uses the most recent term each course is offered."),
  candidateCodes: z
    .array(z.string())
    .max(15)
    .optional()
    .describe(
      "Optional pool of candidate course codes to pair with courseCodes into complete conflict-free schedules."
    ),
  targetCourseCount: z
    .number()
    .int()
    .min(1)
    .max(7)
    .optional()
    .describe(
      "Total courses per proposed schedule when candidateCodes is provided (default: courseCodes.length + 1)."
    ),
  requireOpen: z
    .boolean()
    .optional()
    .describe("When true, only open sections count as feasible picks (default: false)."),
  earliestStart: z
    .string()
    .optional()
    .describe("Optional earliest allowed meeting start time, e.g. '10:00 AM'."),
  latestEnd: z
    .string()
    .optional()
    .describe("Optional latest allowed meeting end time, e.g. '4:30 PM'."),
  avoidDays: z
    .string()
    .optional()
    .describe("Optional comma-separated weekdays to avoid, e.g. 'F' for no Friday classes."),
  maxCourseExamPct: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe(
      "When solving candidateCodes, exclude candidates with confirmed examPct above this threshold."
    ),
  maxAvgExamPct: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe(
      "When solving candidateCodes, keep only proposed schedules whose known average examPct is at or below this threshold."
    ),
  maxSolutions: z
    .number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .describe("Max feasible section combinations or proposed schedules to return (default: 3)."),
});

export type VerifyScheduleArgs = z.infer<typeof verifyScheduleInputSchema>;

export function sectionTypePrefix(title: string): string {
  const match = title.match(/^([A-Z]+)/);
  return match ? match[1] : title;
}

export function isScheduledMeeting(meeting: SolverMeeting): boolean {
  return (
    meeting.days !== 0 &&
    meeting.startTime !== NULL_TIME &&
    meeting.endTime !== NULL_TIME &&
    meeting.endTime > meeting.startTime
  );
}

export function meetingsOverlap(a: SolverMeeting, b: SolverMeeting): boolean {
  if (!isScheduledMeeting(a) || !isScheduledMeeting(b)) return false;
  if ((a.days & b.days) === 0) return false;
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

export function sectionChoicesOverlap(a: GroupedSectionChoice, b: GroupedSectionChoice): boolean {
  for (const ma of a.meetings) {
    for (const mb of b.meetings) {
      if (meetingsOverlap(ma, mb)) return true;
    }
  }
  return false;
}

/**
 * Group raw section rows into atomic section choices per (course, type, title).
 * Multi-meeting sections (e.g., L01 meeting MW 11:00 and F 13:30) stay bundled
 * together so picking L01 reserves all of its meetings.
 */
export function groupCourseSectionVariables(course: SolverCourseInput): {
  variables: { courseCode: string; type: string; choices: GroupedSectionChoice[] }[];
  hasUnscheduledSections: boolean;
} {
  const byType = new Map<string, Map<string, GroupedSectionChoice>>();
  let hasUnscheduledSections = false;

  for (const row of course.sections) {
    const type = row.type ?? sectionTypePrefix(row.title);
    if (!byType.has(type)) byType.set(type, new Map());
    const byTitle = byType.get(type)!;

    const meeting: SolverMeeting = {
      days: row.days,
      startTime: row.startTime,
      endTime: row.endTime,
    };
    const unscheduled = !isScheduledMeeting(meeting);
    if (unscheduled) hasUnscheduledSections = true;

    const existing = byTitle.get(row.title);
    if (existing) {
      existing.meetings.push(meeting);
      if (unscheduled) existing.hasUnscheduledMeetings = true;
      if (row.status === "canceled") existing.status = "canceled";
      else if (row.status === "closed" && existing.status === "open") existing.status = "closed";
    } else {
      byTitle.set(row.title, {
        courseCode: course.code,
        type,
        title: row.title,
        status: row.status,
        cap: row.cap ?? 0,
        tot: row.tot ?? 0,
        meetings: [meeting],
        hasUnscheduledMeetings: unscheduled,
      });
    }
  }

  const variables: { courseCode: string; type: string; choices: GroupedSectionChoice[] }[] = [];
  for (const [type, byTitle] of byType) {
    const choices = [...byTitle.values()].sort((a, b) => {
      // Prefer open sections first, then deterministic title order.
      const rank = (s: string) => (s === "open" ? 0 : s === "closed" ? 1 : 2);
      return rank(a.status) - rank(b.status) || a.title.localeCompare(b.title);
    });
    variables.push({ courseCode: course.code, type, choices });
  }

  return { variables, hasUnscheduledSections };
}

function choiceMatchesTimePrefs(choice: GroupedSectionChoice, options: SolveOptions): boolean {
  if (choice.status === "canceled") return false;
  if (options.requireOpen && choice.status !== "open") return false;

  for (const m of choice.meetings) {
    if (!isScheduledMeeting(m)) continue;
    if (options.avoidDaysMask && (m.days & options.avoidDaysMask) !== 0) return false;
    if (options.earliestStart != null && m.startTime < options.earliestStart) return false;
    if (options.latestEnd != null && m.endTime > options.latestEnd) return false;
  }

  return true;
}

function formatPick(choice: GroupedSectionChoice): FormattedSectionPick {
  return {
    courseCode: choice.courseCode,
    type: choice.type,
    section: choice.title,
    status: choice.status,
    enrolled: choice.tot,
    capacity: choice.cap,
    meetings: choice.meetings.map((m) => ({
      days: valueToDays(m.days),
      startTime: valueToTime(m.startTime),
      endTime: valueToTime(m.endTime),
    })),
    hasUnscheduledMeetings: choice.hasUnscheduledMeetings,
  };
}

/**
 * Deterministic backtracking CSP solver over all required section types for a
 * course set. Uses MRV (fewest valid sections first) and a bounded node budget.
 */
export function solveCourseSet(
  courses: SolverCourseInput[],
  options: SolveOptions = {}
): SolvedCourseSetResult {
  const maxSolutions = Math.max(1, Math.min(options.maxSolutions ?? 3, 10));
  const maxNodes = options.maxNodes ?? 15_000;

  let hasUnscheduledSections = false;
  const allVariables: { courseCode: string; type: string; choices: GroupedSectionChoice[] }[] = [];

  for (const course of courses) {
    const grouped = groupCourseSectionVariables(course);
    if (grouped.hasUnscheduledSections) hasUnscheduledSections = true;
    for (const v of grouped.variables) {
      const eligible = v.choices.filter((c) => choiceMatchesTimePrefs(c, options));
      if (eligible.length === 0) {
        return {
          feasible: false,
          solutions: [],
          hasUnscheduledSections,
          blockingCourse: v.courseCode,
          blockingSectionType: v.type,
          truncated: false,
        };
      }
      allVariables.push({ courseCode: v.courseCode, type: v.type, choices: eligible });
    }
  }

  if (allVariables.length === 0) {
    return {
      feasible: true,
      solutions: [[]],
      hasUnscheduledSections,
      blockingCourse: null,
      blockingSectionType: null,
      truncated: false,
    };
  }

  // Sort by MRV (smallest domain first), then deterministic course/type order.
  allVariables.sort(
    (a, b) =>
      a.choices.length - b.choices.length ||
      a.courseCode.localeCompare(b.courseCode) ||
      a.type.localeCompare(b.type)
  );

  const solutions: FormattedSectionPick[][] = [];
  const chosen: GroupedSectionChoice[] = [];
  let nodes = 0;
  let truncated = false;
  let deepestIndex = -1;

  function backtrack(index: number): void {
    if (solutions.length >= maxSolutions) return;
    if (nodes >= maxNodes) {
      truncated = true;
      return;
    }

    if (index === allVariables.length) {
      const formatted = [...chosen]
        .sort(
          (a, b) =>
            a.courseCode.localeCompare(b.courseCode) ||
            a.type.localeCompare(b.type) ||
            a.title.localeCompare(b.title)
        )
        .map(formatPick);
      solutions.push(formatted);
      return;
    }

    if (index > deepestIndex) deepestIndex = index;
    const variable = allVariables[index];

    for (const choice of variable.choices) {
      if (solutions.length >= maxSolutions) return;
      if (nodes >= maxNodes) {
        truncated = true;
        return;
      }
      nodes++;

      let conflicts = false;
      for (const prev of chosen) {
        if (sectionChoicesOverlap(choice, prev)) {
          conflicts = true;
          break;
        }
      }
      if (conflicts) continue;

      chosen.push(choice);
      backtrack(index + 1);
      chosen.pop();
    }
  }

  backtrack(0);

  if (solutions.length === 0) {
    const blocker = allVariables[Math.max(0, deepestIndex)];
    return {
      feasible: false,
      solutions: [],
      hasUnscheduledSections,
      blockingCourse: blocker?.courseCode ?? null,
      blockingSectionType: blocker?.type ?? null,
      truncated,
    };
  }

  return {
    feasible: true,
    solutions,
    hasUnscheduledSections,
    blockingCourse: null,
    blockingSectionType: null,
    truncated,
  };
}

export function summarizeScheduleGradingLoad(courses: SolverCourseInput[]): ScheduleGradingLoad {
  let knownCount = 0;
  let unknownCount = 0;
  let examSum = 0;
  let psetSum = 0;
  let maxExamPct: number | null = null;

  const perCourse = courses.map((c) => {
    const known = Boolean(c.grading?.known);
    const examPct = known && typeof c.grading?.examPct === "number" ? c.grading.examPct : null;
    const psetPct = known && typeof c.grading?.psetPct === "number" ? c.grading.psetPct : null;
    if (known && examPct != null) {
      knownCount++;
      examSum += examPct;
      if (psetPct != null) psetSum += psetPct;
      if (maxExamPct == null || examPct > maxExamPct) maxExamPct = examPct;
    } else {
      unknownCount++;
    }
    return {
      code: c.code,
      gradingKnown: known,
      examPct,
      psetPct,
    };
  });

  return {
    knownCount,
    unknownCount,
    avgExamPct: knownCount > 0 ? Math.round(examSum / knownCount) : null,
    avgPsetPct: knownCount > 0 ? Math.round(psetSum / knownCount) : null,
    maxExamPct,
    perCourse,
  };
}

function countDistinctDays(picks: FormattedSectionPick[]): number {
  const days = new Set<string>();
  for (const p of picks) {
    for (const m of p.meetings) {
      for (const d of m.days) days.add(d);
    }
  }
  return days.size;
}

/**
 * Given required courses and a candidate pool, search conflict-free complete
 * semesters of size `targetCourseCount` and rank them by open sections, lowest
 * known exam load, and compact days.
 */
export function solveCandidateSchedules(
  requiredCourses: SolverCourseInput[],
  candidatePool: SolverCourseInput[],
  options: CandidateSolveOptions
): CandidateScheduleProposal[] {
  const needed = options.targetCourseCount - requiredCourses.length;
  const maxSchedules = Math.max(1, Math.min(options.maxSchedules ?? 5, 10));

  const requiredCodes = new Set(requiredCourses.map((c) => c.code));
  const filteredPool = candidatePool.filter((c) => {
    if (requiredCodes.has(c.code)) return false;
    if (c.status === "canceled") return false;
    if (
      options.maxCourseExamPct != null &&
      c.grading?.known &&
      c.grading.examPct != null &&
      c.grading.examPct > options.maxCourseExamPct
    ) {
      return false;
    }
    return true;
  });

  if (needed <= 0) {
    const solved = solveCourseSet(requiredCourses, { ...options, maxSolutions: 1 });
    if (!solved.feasible || solved.solutions.length === 0) return [];
    const gradingLoad = summarizeScheduleGradingLoad(requiredCourses);
    if (
      options.maxAvgExamPct != null &&
      gradingLoad.avgExamPct != null &&
      gradingLoad.avgExamPct > options.maxAvgExamPct
    ) {
      return [];
    }
    const picks = solved.solutions[0];
    return [
      {
        courseCodes: requiredCourses.map((c) => c.code),
        sections: picks,
        gradingLoad,
        allSelectedSectionsOpen: picks.every((p) => p.status === "open"),
        distinctClassDays: countDistinctDays(picks),
        hasUnscheduledSections: solved.hasUnscheduledSections,
      },
    ];
  }

  if (filteredPool.length < needed) return [];

  // Sort candidate pool to explore lower-exam courses first.
  const orderedPool = [...filteredPool].sort((a, b) => {
    const aExam = a.grading?.known && a.grading.examPct != null ? a.grading.examPct : 101;
    const bExam = b.grading?.known && b.grading.examPct != null ? b.grading.examPct : 101;
    return aExam - bExam || a.code.localeCompare(b.code);
  });

  const proposals: CandidateScheduleProposal[] = [];
  const picked: SolverCourseInput[] = [];
  let combosChecked = 0;
  const MAX_COMBOS = 250;

  function choose(startIdx: number): void {
    if (combosChecked >= MAX_COMBOS) return;
    if (picked.length === needed) {
      combosChecked++;
      const combined = [...requiredCourses, ...picked];
      const gradingLoad = summarizeScheduleGradingLoad(combined);
      if (
        options.maxAvgExamPct != null &&
        gradingLoad.avgExamPct != null &&
        gradingLoad.avgExamPct > options.maxAvgExamPct
      ) {
        return;
      }

      const solved = solveCourseSet(combined, { ...options, maxSolutions: 1, maxNodes: 4_000 });
      if (!solved.feasible || solved.solutions.length === 0) return;

      const picks = solved.solutions[0];
      proposals.push({
        courseCodes: combined.map((c) => c.code),
        sections: picks,
        gradingLoad,
        allSelectedSectionsOpen: picks.every((p) => p.status === "open"),
        distinctClassDays: countDistinctDays(picks),
        hasUnscheduledSections: solved.hasUnscheduledSections,
      });
      return;
    }

    const remaining = needed - picked.length;
    for (let i = startIdx; i <= orderedPool.length - remaining; i++) {
      if (combosChecked >= MAX_COMBOS) return;
      picked.push(orderedPool[i]);
      choose(i + 1);
      picked.pop();
    }
  }

  choose(0);

  proposals.sort((a, b) => {
    if (a.allSelectedSectionsOpen !== b.allSelectedSectionsOpen) {
      return a.allSelectedSectionsOpen ? -1 : 1;
    }
    const aExam = a.gradingLoad.avgExamPct ?? 101;
    const bExam = b.gradingLoad.avgExamPct ?? 101;
    if (aExam !== bExam) return aExam - bExam;
    if (a.gradingLoad.unknownCount !== b.gradingLoad.unknownCount) {
      return a.gradingLoad.unknownCount - b.gradingLoad.unknownCount;
    }
    return a.distinctClassDays - b.distinctClassDays;
  });

  return proposals.slice(0, maxSchedules);
}

export function evaluateProposedSchedule(params: {
  requiredCourses: ResolvedScheduleCourse[];
  candidateCourses?: ResolvedScheduleCourse[];
  initialIssues: string[];
  args: VerifyScheduleArgs;
}) {
  const issues = [...params.initialIssues];
  const { requiredCourses, candidateCourses = [], args } = params;

  if (requiredCourses.length > 7) {
    issues.push(
      `Too many courses: ${requiredCourses.length} courses selected (max recommended is 7)`
    );
  }

  const terms = [...new Set(requiredCourses.map((c) => c.term))];
  if (terms.length > 1) {
    const termNames = terms.map((t) => `${termCodeToName(t)} (${t})`).join(", ");
    issues.push(`Mixed terms: courses span multiple semesters: ${termNames}`);
  }

  for (const course of requiredCourses) {
    if (course.status === "canceled") {
      issues.push(`Canceled course: ${course.code} is canceled`);
    }

    const grouped = groupCourseSectionVariables(course);
    for (const variable of grouped.variables) {
      const allClosed = variable.choices.every((c) => c.status === "closed");
      const allCanceled = variable.choices.every((c) => c.status === "canceled");
      if (allCanceled) {
        issues.push(
          `No available ${variable.type} sections: all ${variable.type} sections for ${course.code} are canceled`
        );
      } else if (allClosed) {
        const first = variable.choices[0];
        issues.push(
          `All ${variable.type} sections full: all ${variable.type} sections for ${course.code} are closed (${first.tot}/${first.cap} enrolled)`
        );
      }
    }

    if (course.sections.length === 0) {
      issues.push(`No sections: ${course.code} has no sections listed`);
    }
  }

  const solveOpts: SolveOptions = {
    requireOpen: args.requireOpen ?? false,
    maxSolutions: args.maxSolutions ?? 3,
  };

  if (args.earliestStart) {
    const parsed = timeToValue(args.earliestStart);
    if (parsed === NULL_TIME) {
      issues.push(`Invalid earliestStart time format: "${args.earliestStart}"`);
    } else {
      solveOpts.earliestStart = parsed;
    }
  }

  if (args.latestEnd) {
    const parsed = timeToValue(args.latestEnd);
    if (parsed === NULL_TIME) {
      issues.push(`Invalid latestEnd time format: "${args.latestEnd}"`);
    } else {
      solveOpts.latestEnd = parsed;
    }
  }

  if (args.avoidDays) {
    const mask = daysToBitmask(args.avoidDays.split(",").map((d) => d.trim()));
    if (mask === 0) {
      issues.push(`Invalid avoidDays value: "${args.avoidDays}" (use M,T,W,Th,F)`);
    } else {
      solveOpts.avoidDaysMask = mask;
    }
  }

  const solved = solveCourseSet(requiredCourses, solveOpts);
  if (!solved.feasible && requiredCourses.length > 0) {
    const location =
      solved.blockingCourse && solved.blockingSectionType
        ? ` (blocked at ${solved.blockingCourse} ${solved.blockingSectionType})`
        : "";
    issues.push(
      `Time/section conflict: no conflict-free combination of all required sections exists${location}`
    );
  }

  const gradingLoad = summarizeScheduleGradingLoad(requiredCourses);
  const valid = issues.length === 0;

  let proposedSchedules: CandidateScheduleProposal[] | undefined;
  if (candidateCourses.length > 0) {
    const targetCourseCount = args.targetCourseCount ?? Math.min(requiredCourses.length + 1, 7);
    proposedSchedules = solveCandidateSchedules(requiredCourses, candidateCourses, {
      ...solveOpts,
      targetCourseCount,
      maxCourseExamPct: args.maxCourseExamPct,
      maxAvgExamPct: args.maxAvgExamPct,
      maxSchedules: args.maxSolutions ?? 3,
    });
  }

  return {
    valid,
    courseCount: requiredCourses.length,
    term: terms.length === 1 ? { code: terms[0], name: termCodeToName(terms[0]) } : null,
    courses: requiredCourses.map((c) => ({
      code: c.code,
      status: c.status,
      sectionTypes: [...new Set(c.sections.map((s) => s.type ?? sectionTypePrefix(s.title)))],
    })),
    issues: valid ? "Schedule is valid — no issues detected" : issues,
    feasibleCombinations: solved.solutions,
    hasUnscheduledSections: solved.hasUnscheduledSections,
    searchTruncated: solved.truncated,
    gradingLoad,
    ...(proposedSchedules !== undefined ? { proposedSchedules } : {}),
  };
}
