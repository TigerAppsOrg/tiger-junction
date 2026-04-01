/**
 * YAML requirement loader for TigerPath degree requirements.
 *
 * Ports the essential tree-initialization logic from the Python verifier:
 *   _init_year_switch, _init_path_to, _init_req_fields, _init_min_ALL
 */

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const DATA_DIR = path.resolve(import.meta.dir ?? __dirname, "requirements_data");
const REQ_PATH_SEP = "//";

// ── YAML cache ──────────────────────────────────────────────────────────────

const yamlCache = new Map<string, any>();

function loadYaml(relPath: string): any {
  if (yamlCache.has(relPath)) return structuredClone(yamlCache.get(relPath));
  const fullPath = path.join(DATA_DIR, relPath);
  const raw = fs.readFileSync(fullPath, "utf-8");
  const parsed = yaml.load(raw);
  yamlCache.set(relPath, parsed);
  return structuredClone(parsed);
}

// ── Year-switch resolution ──────────────────────────────────────────────────

function yearMatchesCode(year: number, code: string | number | null | undefined): boolean {
  if (typeof code === "number") return year === code;
  if (!code || code.toLowerCase() === "default") return true;
  const c = code.replace(/\s/g, "");
  if (c.startsWith("<=")) return year <= parseInt(c.slice(2));
  if (c.startsWith(">=")) return year >= parseInt(c.slice(2));
  if (c.startsWith("<")) return year < parseInt(c.slice(1));
  if (c.startsWith(">")) return year > parseInt(c.slice(1));
  if (c.startsWith("==")) return year === parseInt(c.slice(2));
  if (c.startsWith("!=")) return year !== parseInt(c.slice(2));
  if (c.includes("-")) {
    const [fr, to] = c.split("-");
    return year >= parseInt(fr) && year <= parseInt(to);
  }
  return year === parseInt(c);
}

function initYearSwitch(req: any, year: number): void {
  if (req.year_switch) {
    let newReq: any = {};
    for (const sub of req.year_switch) {
      const code = sub.year_code ?? null;
      if (yearMatchesCode(year, code)) {
        newReq = { ...sub };
        break;
      }
    }
    delete req.year_switch;
    if (newReq.year_code !== undefined) delete newReq.year_code;
    Object.assign(req, newReq);
  }
  if (req.req_list) {
    for (const sub of req.req_list) {
      initYearSwitch(sub, year);
    }
  }
}

// ── Field initialization ────────────────────────────────────────────────────

function initReqFields(req: any): void {
  req.count = 0;
  if (!req.name || req.name === "") req.name = null;

  if (req.no_req !== undefined) {
    req.no_req = null;
    req.min_needed = 0;
    req.max_counted = 0;
  }
  if (req.min_needed == null) {
    req.min_needed = req.type ? "ALL" : 0;
  }
  if (req.max_counted === undefined) req.max_counted = null;

  if (req.req_list) {
    for (const sub of req.req_list) initReqFields(sub);
  } else if (req.course_list && !req.excluded_course_list) {
    req.excluded_course_list = [];
  } else if (req.num_courses) {
    req.min_needed = req.num_courses;
  }
  if (req.dist_req && typeof req.dist_req === "string") {
    req.dist_req = [req.dist_req];
  }
}

function initMinAll(req: any): number {
  let countFromBelow = 0;
  if (req.req_list) {
    for (const sub of req.req_list) {
      countFromBelow += initMinAll(sub);
    }
  } else if (req.course_list) {
    countFromBelow = req.course_list.length;
  } else if (req.dist_req || req.num_courses) {
    if (req.max_counted) countFromBelow += req.max_counted;
  }
  if (req.min_needed === "ALL") req.min_needed = countFromBelow;
  return req.max_counted == null ? countFromBelow : Math.min(req.max_counted, countFromBelow);
}

// ── Path assignment ─────────────────────────────────────────────────────────

function initPathTo(req: any, year: number): void {
  if (!req.path_to) {
    const id = req.type === "Major" || req.type === "Degree" ? req.code : req.name;
    req.path_to = `${req.type}${REQ_PATH_SEP}${year}${REQ_PATH_SEP}${id}`;
  }
  if (req.req_list) {
    for (let i = 0; i < req.req_list.length; i++) {
      const sub = req.req_list[i];
      const identifier = sub.name && sub.name !== "" ? sub.name : String(i).padStart(3, "0");
      sub.path_to = `${req.path_to}${REQ_PATH_SEP}${identifier}`;
      initPathTo(sub, year);
    }
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

function formatTree(req: any): any {
  if (req.name === null) return null;

  const node: any = {};
  for (const key of ["name", "code", "degree", "path_to", "description", "urls", "explanation"]) {
    if (req[key] !== undefined) node[key] = req[key];
  }
  if (req.contacts) node.contacts = req.contacts;
  if (req.pdfs_allowed !== undefined) node.pdfs_allowed = req.pdfs_allowed;
  if (req.completed_by_semester !== undefined) node.completed_by_semester = req.completed_by_semester;

  node.min_needed = req.min_needed;
  node.max_counted = req.max_counted;

  if (req.course_list) {
    node.course_list = req.course_list.map((c: any) =>
      typeof c === "object" ? Object.keys(c)[0] : String(c).split(":")[0]
    );
  }
  if (req.dist_req) node.dist_req = req.dist_req;

  if (req.req_list) {
    const children = req.req_list.map(formatTree).filter((c: any) => c !== null);
    if (children.length > 0) node.req_list = children;
  }

  return node;
}

export function getRequirementTree(majorCode: string, year: number): any {
  const filePath = `majors/${majorCode}.yaml`;
  let req: any;
  try {
    req = loadYaml(filePath);
  } catch {
    return null;
  }
  initYearSwitch(req, year);
  initReqFields(req);
  initMinAll(req);
  initPathTo(req, year);
  return formatTree(req);
}

export function getDegreeTree(degreeCode: string, year: number): any {
  const filePath = `degrees/${degreeCode}.yaml`;
  let req: any;
  try {
    req = loadYaml(filePath);
  } catch {
    return null;
  }
  initYearSwitch(req, year);
  initReqFields(req);
  initMinAll(req);
  initPathTo(req, year);
  return formatTree(req);
}

export function getRequirementNode(
  majorCode: string,
  year: number,
  pathSuffix: string
): any | null {
  const tree = getRequirementTree(majorCode, year);
  if (!tree) return null;

  function findByPath(node: any): any | null {
    if (node.path_to && node.path_to.endsWith(pathSuffix)) return node;
    if (node.req_list) {
      for (const child of node.req_list) {
        const found = findByPath(child);
        if (found) return found;
      }
    }
    return null;
  }

  return findByPath(tree);
}

export function listAvailableMajors(): string[] {
  const majorsDir = path.join(DATA_DIR, "majors");
  return fs
    .readdirSync(majorsDir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => f.replace(".yaml", ""))
    .sort();
}
