/**
 * Requirement checker — evaluates a requirement tree against a student's courses.
 * Ported from HoagiePlan's requirements.py, adapted to work on plain TypeScript structures.
 */

import type { RequirementNode } from "./loader.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StudentCourse {
  /** Course code, e.g. "COS 226" */
  id: string;
  /** Department code, e.g. "COS" */
  deptCode: string;
  /** Catalog number, e.g. "226" */
  catNum: string;
  /** Distribution area(s), e.g. "QCR" or "STL or QCR" */
  distributionArea?: string | null;
  /** Semester number 1-8 */
  semester: number;
}

interface InternalCourse extends StudentCourse {
  possibleReqs: number[];
  reqsDoubleCounted: number[];
  numSettleable: number;
  settled: number[];
}

export interface RequirementResult {
  name: string | null;
  code: string | null;
  reqId: number;
  satisfied: boolean;
  count: number;
  minNeeded: number;
  maxCounted: number | null;
  explanation: string | null;
  subrequirements?: Record<string, RequirementResult>;
  settledCourses?: string[];
  unsettledCourses?: string[];
}

// ---------------------------------------------------------------------------
// Wildcard / course matching
// ---------------------------------------------------------------------------

function courseMatchesList(courseCode: string, list: string[]): boolean {
  const norm = courseCode.replace(/\s+/g, " ").toUpperCase();
  for (const entry of list) {
    const entryNorm = entry.replace(/\s+/g, " ").toUpperCase();
    if (!entryNorm.includes("*")) {
      if (norm === entryNorm) return true;
    } else {
      // Wildcard matching: "COS 3*" or "COS 3**" or "WRI 1**"
      const [eDept, eNum] = entryNorm.split(" ");
      const [cDept, cNum] = norm.split(" ");
      if (eDept !== cDept || !eNum || !cNum) continue;
      let match = true;
      for (let i = 0; i < eNum.length && i < cNum.length; i++) {
        if (eNum[i] === "*") continue;
        if (eNum[i] !== cNum[i]) { match = false; break; }
      }
      if (match && cNum.length >= eNum.length) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Phase 1: init courses
// ---------------------------------------------------------------------------

function initCourses(courses: StudentCourse[]): InternalCourse[] {
  return courses.map((c) => ({
    ...c,
    possibleReqs: [],
    reqsDoubleCounted: [],
    numSettleable: 0,
    settled: [],
  }));
}

// ---------------------------------------------------------------------------
// Phase 2: mark possible requirements
// ---------------------------------------------------------------------------

function markPossibleReqs(req: RequirementNode, courses: InternalCourse[]): void {
  if (req.reqList) {
    for (const sub of req.reqList) markPossibleReqs(sub, courses);
  } else {
    if (req.courseList || req.deptList) markPossibleCourseListReqs(req, courses);
    if (req.distReq) markPossibleDistReqs(req, courses);
  }
}

function markPossibleDistReqs(req: RequirementNode, courses: InternalCourse[]): void {
  for (const course of courses) {
    if (course.possibleReqs.includes(req.id)) continue;
    if (!course.distributionArea) continue;
    const areas = course.distributionArea.split(" or ").map((a) => a.trim());
    if (areas.some((a) => req.distReq!.includes(a))) {
      course.possibleReqs.push(req.id);
      if (!req.doubleCountingAllowed) course.numSettleable++;
    }
  }
}

function markPossibleCourseListReqs(req: RequirementNode, courses: InternalCourse[]): void {
  for (const course of courses) {
    if (course.semester > (req.completedBySemester ?? 8)) continue;
    if (course.possibleReqs.includes(req.id)) continue;
    if (req.excludedCourseList && courseMatchesList(course.id, req.excludedCourseList)) continue;

    let matched = false;

    if (req.deptList) {
      for (const dept of req.deptList) {
        if (dept === course.deptCode) { matched = true; break; }
      }
    }

    if (!matched && req.courseList) {
      if (courseMatchesList(course.id, req.courseList)) matched = true;
    }

    if (matched) {
      course.possibleReqs.push(req.id);
      if (!req.doubleCountingAllowed) course.numSettleable++;
    }
  }
}

// ---------------------------------------------------------------------------
// Phase 3: settle courses into requirements
// ---------------------------------------------------------------------------

function assignSettled(req: RequirementNode, courses: InternalCourse[]): number {
  const oldDeficit = req.minNeeded - (req as any)._count;
  const oldAvailable = req.maxCounted ? req.maxCounted - (req as any)._count : 0;
  const wasSatisfied = oldDeficit <= 0;
  let newlySatisfied = 0;

  if (req.reqList) {
    for (const sub of req.reqList) {
      newlySatisfied += assignSettled(sub, courses);
    }
  } else if (req.doubleCountingAllowed) {
    newlySatisfied = settleDoubleCounting(req, courses);
  } else if (req.courseList || req.deptList || req.distReq) {
    newlySatisfied = settleReqs(req, courses);
  } else if (req.numCourses) {
    newlySatisfied = checkDegreeProgress(req, courses);
  } else {
    newlySatisfied = 1; // auto-satisfied (IW, papers)
  }

  (req as any)._count += newlySatisfied;
  const newDeficit = req.minNeeded - (req as any)._count;

  if (!wasSatisfied && newDeficit <= 0) {
    return req.maxCounted != null ? Math.min(req.maxCounted, (req as any)._count) : (req as any)._count;
  } else if (wasSatisfied && newDeficit <= 0) {
    return req.maxCounted != null ? Math.min(oldAvailable, newlySatisfied) : newlySatisfied;
  }
  return 0;
}

function settleDoubleCounting(req: RequirementNode, courses: InternalCourse[]): number {
  let count = 0;
  for (const c of courses) {
    if (c.possibleReqs.includes(req.id)) {
      count++;
      c.reqsDoubleCounted.push(req.id);
    }
  }
  return count;
}

function settleReqs(req: RequirementNode, courses: InternalCourse[]): number {
  let count = 0;
  for (const c of courses) {
    if (
      c.numSettleable === 1 &&
      c.possibleReqs.includes(req.id) &&
      !c.settled.includes(req.id)
    ) {
      count++;
      c.settled.push(req.id);
    }
  }
  return count;
}

function checkDegreeProgress(req: RequirementNode, courses: InternalCourse[]): number {
  const bySem = req.completedBySemester ?? 8;
  return courses.filter((c) => c.semester <= bySem).length;
}

// ---------------------------------------------------------------------------
// Phase 4: format output
// ---------------------------------------------------------------------------

function formatOutput(req: RequirementNode, courses: InternalCourse[]): RequirementResult {
  const count = (req as any)._count as number;
  const result: RequirementResult = {
    name: req.name,
    code: req.code,
    reqId: req.id,
    satisfied: count >= req.minNeeded,
    count,
    minNeeded: req.minNeeded,
    maxCounted: req.maxCounted,
    explanation: req.explanation,
  };

  if (req.reqList) {
    result.subrequirements = {};
    for (const sub of req.reqList) {
      const child = formatOutput(sub, courses);
      const key = child.name ?? child.code ?? `Req ${child.reqId}`;
      result.subrequirements[key] = child;
    }
  } else {
    const settled: string[] = [];
    const unsettled: string[] = [];
    for (const c of courses) {
      if (req.doubleCountingAllowed) {
        if (c.reqsDoubleCounted.includes(req.id)) settled.push(c.id);
      } else if (c.settled.includes(req.id)) {
        settled.push(c.id);
      } else if (c.possibleReqs.includes(req.id)) {
        unsettled.push(c.id);
      }
    }
    if (settled.length > 0) result.settledCourses = settled;
    if (unsettled.length > 0) result.unsettledCourses = unsettled;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Initialize _count on all nodes
// ---------------------------------------------------------------------------

function initCounts(req: RequirementNode): void {
  (req as any)._count = 0;
  if (req.reqList) {
    for (const sub of req.reqList) initCounts(sub);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check how a set of courses satisfies a requirement tree.
 * Returns a tree showing which requirements are met and which aren't.
 */
export function checkRequirements(
  req: RequirementNode,
  studentCourses: StudentCourse[]
): RequirementResult {
  // Deep clone the req tree so we don't mutate the cached version
  const tree = structuredClone(req);
  initCounts(tree);

  const courses = initCourses(studentCourses);
  markPossibleReqs(tree, courses);
  assignSettled(tree, courses);
  return formatOutput(tree, courses);
}

/**
 * Quick summary: how many top-level requirements are satisfied?
 */
export function quickProgress(
  req: RequirementNode,
  studentCourses: StudentCourse[]
): { satisfied: number; total: number; percentage: number } {
  const result = checkRequirements(req, studentCourses);
  if (!result.subrequirements) {
    return {
      satisfied: result.satisfied ? 1 : 0,
      total: 1,
      percentage: result.satisfied ? 100 : 0,
    };
  }
  const subs = Object.values(result.subrequirements);
  const satisfied = subs.filter((s) => s.satisfied).length;
  return {
    satisfied,
    total: subs.length,
    percentage: Math.round((satisfied / subs.length) * 100),
  };
}
