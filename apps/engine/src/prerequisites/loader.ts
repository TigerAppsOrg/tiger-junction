/**
 * Loads Tiger Junction prerequisite YAML files from apps/prerequisites/lib/.
 *
 * Each YAML file has:
 *   - Front matter (between ---): code, name, category, optional vars[]
 *   - Course list: array of {course, last, reqs?, equiv?, notes?, travel?, iw?, id?}
 *
 * The `vars` in front matter are local macros: {name, equ} where `name` is
 * replaced by `equ` in `reqs` expressions for that department.
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { parse } from "yaml";

export interface PrereqCourse {
  course: string; // e.g. "COS 226"
  last: number | string; // term code or "SUMMER"
  reqs?: string; // boolean expression, e.g. "INTROCOS & (LINEAR | MAT175)"
  equiv?: string[]; // equivalent courses
  notes?: string;
  travel?: unknown;
  iw?: unknown;
  id?: string;
}

interface DeptFrontMatter {
  code: string;
  name: string;
  category: string;
  updated?: string;
  absorbed?: string;
  vars?: Array<{ name: string; equ: string }>;
}

export interface DeptPrereqs {
  code: string;
  name: string;
  category: string;
  vars: Array<{ name: string; equ: string }>;
  courses: PrereqCourse[];
}

/**
 * Load a single department YAML file.
 */
export function loadDeptFile(filePath: string): DeptPrereqs {
  const raw = readFileSync(filePath, "utf-8");

  // Split on --- delimiters: [empty, frontMatter, courseList]
  const parts = raw.split("---");
  const frontMatter: DeptFrontMatter = parse(parts[1]);
  const courses: PrereqCourse[] = parse(parts[2]) ?? [];

  // Normalize course codes to have a space: "COS226" -> "COS 226"
  for (const c of courses) {
    const stripped = c.course.replace(/\s/g, "");
    c.course = stripped.slice(0, 3) + " " + stripped.slice(3);
  }

  return {
    code: frontMatter.code,
    name: frontMatter.name,
    category: frontMatter.category,
    vars: frontMatter.vars ?? [],
    courses,
  };
}

/**
 * Load all department files from the prerequisites lib directory.
 * Returns a map of course code -> PrereqCourse (with dept vars attached for expansion).
 */
export function loadAllPrereqs(
  libDir: string
): Map<string, { course: PrereqCourse; deptVars: Array<{ name: string; equ: string }> }> {
  const result = new Map<
    string,
    { course: PrereqCourse; deptVars: Array<{ name: string; equ: string }> }
  >();

  const categories = readdirSync(libDir);
  for (const category of categories) {
    const categoryPath = join(libDir, category);
    let files: string[];
    try {
      files = readdirSync(categoryPath).filter((f) => f.endsWith(".yaml"));
    } catch {
      continue; // skip non-directories
    }

    for (const file of files) {
      const dept = loadDeptFile(join(categoryPath, file));
      for (const course of dept.courses) {
        result.set(course.course, { course, deptVars: dept.vars });
      }
    }
  }

  return result;
}
