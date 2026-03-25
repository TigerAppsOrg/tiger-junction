/**
 * Loads HoagiePlan requirement YAML files into typed TypeScript structures.
 * Adapted from plan/backend/data/insert_yamls.py — no Django.
 *
 * The YAML files live at: course_requirements/major_requirements/data/
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { parse } from "yaml";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RequirementNode {
  id: number;
  name: string | null;
  code: string | null;
  table: "Degree" | "Major" | "Minor" | "Certificate" | "Requirement";
  maxCounted: number | null;
  minNeeded: number;
  doubleCountingAllowed: boolean;
  maxCommonWithMajor: number;
  completedBySemester: number;
  explanation: string | null;
  // Leaf matching criteria (at most one of these per leaf)
  courseList: string[] | null; // specific course codes, may include wildcards
  excludedCourseList: string[] | null;
  deptList: string[] | null; // entire departments
  distReq: string[] | null; // distribution areas
  numCourses: number | null; // for degree progress checks
  noReq: boolean;
  // Children
  reqList: RequirementNode[] | null;
  // Extra metadata
  degreeCode?: string; // for majors: "AB" or "BSE"
  urls?: string[];
  contacts?: Array<{ type: string; name: string; email: string }>;
  description?: string;
  iwRequired?: boolean;
}

export interface ProgramSummary {
  code: string;
  name: string;
  type: "Degree" | "Major" | "Minor" | "Certificate";
  description?: string;
  urls?: string[];
  contacts?: Array<{ type: string; name: string; email: string }>;
  degreeCode?: string;
  iwRequired?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LANG_DEPTS = [
  "ARA", "ASL", "SLA", "CHI", "CZE", "FRE", "GER", "MOG", "CLG",
  "HEB", "HIN", "ITA", "JPN", "KOR", "LAT", "PER", "POR", "RUS",
  "SAN", "SPA", "SWA", "TUR", "TWI", "URD",
];

const BSE_MAJORS = new Set([
  "CBE", "CEE", "COS-BSE", "ECE", "MAE", "ORF",
]);

// ---------------------------------------------------------------------------
// ID allocator
// ---------------------------------------------------------------------------

let nextId = 1;
function allocId(): number {
  return nextId++;
}

export function resetIds(): void {
  nextId = 1;
}

// ---------------------------------------------------------------------------
// Course list resolution (wildcards, LANG expansion)
// ---------------------------------------------------------------------------

function resolveCourseList(
  rawList: unknown[]
): { courses: string[]; depts: string[] } {
  const courses: string[] = [];
  const depts: string[] = [];

  for (let raw of rawList) {
    if (typeof raw === "object" && raw !== null) {
      raw = Object.keys(raw)[0];
    }
    const code = raw as string;
    const parts = code.replace("/", " ").split(/\s+/);
    const dept = parts[0];
    const num = parts[1] ?? "*";

    const targetDepts = dept === "LANG" ? LANG_DEPTS : [dept];

    for (const d of targetDepts) {
      if (num === "*" || num === "***") {
        depts.push(d);
      } else {
        courses.push(`${d} ${num}`);
      }
    }
  }

  return { courses, depts };
}

// ---------------------------------------------------------------------------
// YAML → RequirementNode
// ---------------------------------------------------------------------------

function buildRequirement(
  yaml: Record<string, unknown>,
  inheritedFields?: { completedBySemester?: number; doubleCountingAllowed?: boolean }
): RequirementNode {
  const node: RequirementNode = {
    id: allocId(),
    name: (yaml.name as string) ?? null,
    code: (yaml.code as string) ?? null,
    table: "Requirement",
    maxCounted: yaml.max_counted != null ? (yaml.max_counted as number) : null,
    minNeeded: 1,
    doubleCountingAllowed: (yaml.double_counting_allowed as boolean) ?? inheritedFields?.doubleCountingAllowed ?? false,
    maxCommonWithMajor: (yaml.max_common_with_major as number) ?? 0,
    completedBySemester: (yaml.completed_by_semester as number) ?? inheritedFields?.completedBySemester ?? 8,
    explanation: (yaml.explanation as string) ?? null,
    courseList: null,
    excludedCourseList: null,
    deptList: null,
    distReq: null,
    numCourses: null,
    noReq: "no_req" in yaml,
    reqList: null,
  };

  // Handle no_req
  if (node.noReq) {
    node.minNeeded = 0;
  }

  // Handle min_needed
  const rawMin = yaml.min_needed;
  if (rawMin === "ALL") {
    if (yaml.req_list) {
      node.minNeeded = (yaml.req_list as unknown[]).length;
    } else if (yaml.course_list) {
      node.minNeeded = (yaml.course_list as unknown[]).length;
    }
  } else if (rawMin != null) {
    node.minNeeded = rawMin as number;
  }

  // Handle num_courses (degree progress)
  if (yaml.num_courses != null) {
    node.numCourses = yaml.num_courses as number;
    node.minNeeded = node.numCourses;
  }

  // Handle dist_req
  if (yaml.dist_req != null) {
    const d = yaml.dist_req;
    node.distReq = typeof d === "string" ? [d] : (d as string[]);
  }

  // Handle dept_list (raw, separate from course_list expansion)
  if (yaml.dept_list != null) {
    node.deptList = yaml.dept_list as string[];
  }

  // Propagatable fields for children
  const childInherited = {
    completedBySemester: node.completedBySemester,
    doubleCountingAllowed: node.doubleCountingAllowed || undefined,
  };

  // Recurse into sub-requirements
  if (yaml.req_list && (yaml.req_list as unknown[]).length > 0) {
    node.reqList = (yaml.req_list as Record<string, unknown>[]).map((sub) =>
      buildRequirement(sub, childInherited)
    );
  } else if (yaml.course_list && (yaml.course_list as unknown[]).length > 0) {
    const { courses, depts } = resolveCourseList(yaml.course_list as unknown[]);
    if (courses.length > 0) node.courseList = courses;
    if (depts.length > 0) {
      node.deptList = [...(node.deptList ?? []), ...depts];
    }

    if (yaml.excluded_course_list && (yaml.excluded_course_list as unknown[]).length > 0) {
      const { courses: excluded } = resolveCourseList(yaml.excluded_course_list as unknown[]);
      if (excluded.length > 0) node.excludedCourseList = excluded;
    }
  } else if (
    node.distReq == null &&
    node.numCourses == null &&
    node.deptList == null &&
    !node.noReq
  ) {
    // Leaf with nothing to check — auto-satisfied (IW, papers, etc.)
    node.maxCounted = 1;
    node.minNeeded = 0;
  }

  return node;
}

function buildProgram(
  yaml: Record<string, unknown>,
  table: "Degree" | "Major" | "Minor" | "Certificate"
): RequirementNode {
  const reqListRaw = (yaml.req_list as Record<string, unknown>[]) ?? [];

  const node: RequirementNode = {
    id: allocId(),
    name: (yaml.name as string) ?? null,
    code: (yaml.code as string) ?? null,
    table,
    maxCounted: null,
    minNeeded: reqListRaw.length,
    doubleCountingAllowed: false,
    maxCommonWithMajor: 0,
    completedBySemester: 8,
    explanation: null,
    courseList: null,
    excludedCourseList: null,
    deptList: null,
    distReq: null,
    numCourses: null,
    noReq: false,
    reqList: reqListRaw.map((sub) => buildRequirement(sub)),
    description: yaml.description as string | undefined,
    urls: yaml.urls as string[] | undefined,
    contacts: yaml.contacts as Array<{ type: string; name: string; email: string }> | undefined,
    iwRequired: yaml.iw_required as boolean | undefined,
  };

  if (table === "Major") {
    node.degreeCode = BSE_MAJORS.has(node.code ?? "") ? "BSE" : "AB";
  }

  return node;
}

// ---------------------------------------------------------------------------
// File loaders
// ---------------------------------------------------------------------------

function loadYaml(filePath: string): Record<string, unknown> {
  return parse(readFileSync(filePath, "utf-8"));
}

function loadDir(
  dir: string,
  table: "Degree" | "Major" | "Minor" | "Certificate"
): Map<string, RequirementNode> {
  const result = new Map<string, RequirementNode>();
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".yaml"));
  } catch {
    return result;
  }
  for (const file of files.sort()) {
    const yaml = loadYaml(join(dir, file));
    const node = buildProgram(yaml, table);
    if (node.code) result.set(node.code, node);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface AllRequirements {
  degrees: Map<string, RequirementNode>;
  majors: Map<string, RequirementNode>;
  minors: Map<string, RequirementNode>;
  certificates: Map<string, RequirementNode>;
}

export function loadAllRequirements(dataDir: string): AllRequirements {
  resetIds();
  return {
    degrees: loadDir(join(dataDir, "degrees"), "Degree"),
    majors: loadDir(join(dataDir, "majors"), "Major"),
    minors: loadDir(join(dataDir, "minors"), "Minor"),
    certificates: loadDir(join(dataDir, "certificates"), "Certificate"),
  };
}

export function listPrograms(reqs: AllRequirements): ProgramSummary[] {
  const result: ProgramSummary[] = [];
  for (const [, node] of reqs.degrees) {
    result.push({ code: node.code!, name: node.name!, type: "Degree", description: node.description, urls: node.urls });
  }
  for (const [, node] of reqs.majors) {
    result.push({ code: node.code!, name: node.name!, type: "Major", description: node.description, urls: node.urls, contacts: node.contacts, degreeCode: node.degreeCode, iwRequired: node.iwRequired });
  }
  for (const [, node] of reqs.minors) {
    result.push({ code: node.code!, name: node.name!, type: "Minor", description: node.description, urls: node.urls, contacts: node.contacts, iwRequired: node.iwRequired });
  }
  for (const [, node] of reqs.certificates) {
    result.push({ code: node.code!, name: node.name!, type: "Certificate", description: node.description, urls: node.urls, contacts: node.contacts, iwRequired: node.iwRequired });
  }
  return result;
}
