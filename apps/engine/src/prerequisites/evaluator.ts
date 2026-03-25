/**
 * Boolean expression parser and evaluator for Tiger Junction prerequisite expressions.
 *
 * Supports:
 *   - `&` (AND), `|` (OR), parentheses for grouping
 *   - Course codes without spaces: "COS226", "MAT202"
 *   - Special macros: "INTROCOS", "BOTHCOS", etc (expanded before parsing)
 *   - Local vars from department YAML front matter
 *   - `$` prefix: corequisite (treated as satisfied if in completed OR current courses)
 *   - `<` prefix: any course in dept with number >= the given number
 *   - `**` wildcards: "MAT2**" matches all MAT 200-level courses
 *
 * Grammar:
 *   expr     = term ("|" term)*
 *   term     = factor ("&" factor)*
 *   factor   = "(" expr ")" | courseToken
 */

import { SPECIAL_MACROS } from "./macros.js";

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

type Token =
  | { type: "LPAREN" }
  | { type: "RPAREN" }
  | { type: "AND" }
  | { type: "OR" }
  | { type: "COURSE"; value: string; corequisite: boolean; greaterThan: boolean };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];
    if (ch === " " || ch === "\t") {
      i++;
    } else if (ch === "(") {
      tokens.push({ type: "LPAREN" });
      i++;
    } else if (ch === ")") {
      tokens.push({ type: "RPAREN" });
      i++;
    } else if (ch === "&") {
      tokens.push({ type: "AND" });
      i++;
    } else if (ch === "|") {
      tokens.push({ type: "OR" });
      i++;
    } else {
      // Course token — may start with $ or <
      let corequisite = false;
      let greaterThan = false;
      if (ch === "$") {
        corequisite = true;
        i++;
      } else if (ch === "<") {
        greaterThan = true;
        i++;
      }
      let value = "";
      while (i < expr.length && /[A-Za-z0-9*]/.test(expr[i])) {
        value += expr[i];
        i++;
      }
      if (value) {
        tokens.push({ type: "COURSE", value, corequisite, greaterThan });
      }
    }
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// AST
// ---------------------------------------------------------------------------

type ASTNode =
  | { kind: "and"; children: ASTNode[] }
  | { kind: "or"; children: ASTNode[] }
  | { kind: "course"; code: string; corequisite: boolean; greaterThan: boolean };

function parseExpr(tokens: Token[], pos: { i: number }): ASTNode {
  let left = parseTerm(tokens, pos);
  const children = [left];
  while (pos.i < tokens.length && tokens[pos.i].type === "OR") {
    pos.i++; // skip |
    children.push(parseTerm(tokens, pos));
  }
  return children.length === 1 ? children[0] : { kind: "or", children };
}

function parseTerm(tokens: Token[], pos: { i: number }): ASTNode {
  let left = parseFactor(tokens, pos);
  const children = [left];
  while (pos.i < tokens.length && tokens[pos.i].type === "AND") {
    pos.i++; // skip &
    children.push(parseFactor(tokens, pos));
  }
  return children.length === 1 ? children[0] : { kind: "and", children };
}

function parseFactor(tokens: Token[], pos: { i: number }): ASTNode {
  const tok = tokens[pos.i];
  if (!tok) throw new Error("Unexpected end of expression");

  if (tok.type === "LPAREN") {
    pos.i++; // skip (
    const node = parseExpr(tokens, pos);
    if (pos.i < tokens.length && tokens[pos.i].type === "RPAREN") {
      pos.i++; // skip )
    }
    return node;
  }

  if (tok.type === "COURSE") {
    pos.i++;
    return {
      kind: "course",
      code: tok.value,
      corequisite: tok.corequisite,
      greaterThan: tok.greaterThan,
    };
  }

  throw new Error(`Unexpected token: ${JSON.stringify(tok)}`);
}

// ---------------------------------------------------------------------------
// Macro expansion
// ---------------------------------------------------------------------------

/**
 * Expand all macros (special + local vars) in a reqs expression string.
 * Iterates until no more expansions happen to handle nested macros (e.g. PHYS -> MECH -> ...).
 */
export function expandMacros(
  expr: string,
  localVars?: Array<{ name: string; equ: string }>
): string {
  const allMacros: Record<string, string> = { ...SPECIAL_MACROS };
  if (localVars) {
    for (const v of localVars) {
      allMacros[v.name] = v.equ;
    }
  }

  let prev = "";
  let current = expr;
  let iterations = 0;
  while (current !== prev && iterations < 20) {
    prev = current;
    for (const [name, replacement] of Object.entries(allMacros)) {
      // Replace whole-word occurrences only
      current = current.replace(
        new RegExp(`\\b${name}\\b`, "g"),
        `(${replacement})`
      );
    }
    iterations++;
  }
  return current;
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

/**
 * Normalize a course code for comparison: remove spaces, uppercase.
 * "COS 226" -> "COS226", "cos226" -> "COS226"
 */
function normalize(code: string): string {
  return code.replace(/\s+/g, "").toUpperCase();
}

/**
 * Check if a course code matches a possibly-wildcarded pattern.
 * "MAT2**" matches "MAT201", "MAT217", etc.
 */
function matchesPattern(pattern: string, code: string): boolean {
  if (!pattern.includes("*")) return pattern === code;
  if (pattern.length !== code.length) return false;
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === "*") continue;
    if (pattern[i] !== code[i]) return false;
  }
  return true;
}

/**
 * Check if a course code is in a set, considering wildcards and >= matching.
 */
function courseInSet(
  code: string,
  greaterThan: boolean,
  completedSet: Set<string>
): boolean {
  const norm = normalize(code);

  if (norm.includes("*")) {
    for (const completed of completedSet) {
      if (matchesPattern(norm, completed)) return true;
    }
    return false;
  }

  if (greaterThan) {
    // "<MAT300" means any MAT course with number >= 300
    const dept = norm.replace(/[0-9]/g, "");
    const numStr = norm.replace(/[A-Z]/g, "");
    const num = parseInt(numStr, 10);
    if (isNaN(num)) return false;
    for (const completed of completedSet) {
      const cDept = completed.replace(/[0-9]/g, "");
      const cNumStr = completed.replace(/[A-Z]/g, "");
      const cNum = parseInt(cNumStr, 10);
      if (cDept === dept && !isNaN(cNum) && cNum >= num) return true;
    }
    return false;
  }

  return completedSet.has(norm);
}

function evaluateNode(
  node: ASTNode,
  completedSet: Set<string>,
  currentSet: Set<string>
): boolean {
  switch (node.kind) {
    case "and":
      return node.children.every((c) =>
        evaluateNode(c, completedSet, currentSet)
      );
    case "or":
      return node.children.some((c) =>
        evaluateNode(c, completedSet, currentSet)
      );
    case "course": {
      // Corequisites are satisfied by completed OR current courses
      const searchSet = node.corequisite
        ? new Set([...completedSet, ...currentSet])
        : completedSet;
      return courseInSet(node.code, node.greaterThan, searchSet);
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface PrereqResult {
  satisfied: boolean;
  missingCourses: string[];
}

/**
 * Evaluate whether a prerequisite expression is satisfied.
 *
 * @param reqs - The raw `reqs` string from the YAML (e.g. "INTROCOS & (LINEAR | MAT175)")
 * @param completedCourses - Courses the student has already taken (e.g. ["COS 126", "MAT 202"])
 * @param currentCourses - Courses the student is taking this semester (for corequisites)
 * @param localVars - Department-local macro vars from the YAML front matter
 */
export function evaluatePrereqs(
  reqs: string,
  completedCourses: string[],
  currentCourses: string[] = [],
  localVars?: Array<{ name: string; equ: string }>
): PrereqResult {
  const expanded = expandMacros(reqs, localVars);
  const tokens = tokenize(expanded);
  if (tokens.length === 0) return { satisfied: true, missingCourses: [] };

  const ast = parseExpr(tokens, { i: 0 });

  const completedSet = new Set(completedCourses.map(normalize));
  const currentSet = new Set(currentCourses.map(normalize));

  const satisfied = evaluateNode(ast, completedSet, currentSet);

  // Collect missing leaf courses for the user
  const missingCourses: string[] = [];
  collectMissing(ast, completedSet, currentSet, missingCourses);

  return { satisfied, missingCourses: [...new Set(missingCourses)] };
}

function collectMissing(
  node: ASTNode,
  completedSet: Set<string>,
  currentSet: Set<string>,
  missing: string[]
): void {
  if (node.kind === "course") {
    const searchSet = node.corequisite
      ? new Set([...completedSet, ...currentSet])
      : completedSet;
    if (!courseInSet(node.code, node.greaterThan, searchSet)) {
      // Format nicely: "COS226" -> "COS 226"
      const code = node.code;
      const formatted =
        code.length > 3 && /^[A-Z]{3}\d/.test(code)
          ? code.slice(0, 3) + " " + code.slice(3)
          : code;
      missing.push(formatted);
    }
  } else {
    for (const child of node.children) {
      collectMissing(child, completedSet, currentSet, missing);
    }
  }
}

/**
 * Parse a reqs expression and return a human-readable tree for display.
 */
export function describePrereqs(
  reqs: string,
  localVars?: Array<{ name: string; equ: string }>
): string {
  const expanded = expandMacros(reqs, localVars);
  const tokens = tokenize(expanded);
  if (tokens.length === 0) return "None";
  const ast = parseExpr(tokens, { i: 0 });
  return describeNode(ast);
}

function describeNode(node: ASTNode): string {
  switch (node.kind) {
    case "course": {
      const prefix = node.corequisite
        ? "(coreq) "
        : node.greaterThan
          ? ">= "
          : "";
      const code = node.code;
      const formatted =
        code.length > 3 && /^[A-Z]{3}\d/.test(code)
          ? code.slice(0, 3) + " " + code.slice(3)
          : code;
      return prefix + formatted;
    }
    case "and":
      return node.children.map(describeNode).join(" AND ");
    case "or": {
      const inner = node.children.map(describeNode).join(" OR ");
      return `(${inner})`;
    }
  }
}
