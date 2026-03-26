import { and, desc, eq, ilike, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../db/schema.js";

export interface ResolvedCourse {
  id: string;
  listingId: string;
  term: number;
  code: string;
  title: string;
}

export interface ResolutionResult<T> {
  value?: T;
  error?: string;
  options?: unknown[];
}

export function isValidCourseId(courseId: string): boolean {
  return /^\d{4,}-\d{4}$/.test(courseId.trim());
}

export function isValidListingId(listingId: string): boolean {
  return /^\d{4,}$/.test(listingId.trim());
}

function normalizeNoWhitespace(raw: string): string {
  return raw.toUpperCase().replace(/\s+/g, "");
}

function toResolvedCourse(row: {
  id: string;
  listingId: string;
  term: number;
  code: string;
  title: string;
}): ResolvedCourse {
  return {
    id: row.id,
    listingId: row.listingId,
    term: row.term,
    code: row.code,
    title: row.title,
  };
}

export async function resolveCourseByCode(
  db: NodePgDatabase,
  code: string,
  term?: number
): Promise<ResolutionResult<ResolvedCourse>> {
  const normalized = normalizeNoWhitespace(code);
  if (!normalized) return { error: "Course code cannot be empty." };

  const conditions = [
    sql`regexp_replace(upper(${schema.courses.code}), '\\s+', '', 'g') ILIKE ${`%${normalized}%`}`,
  ];
  if (term) conditions.push(eq(schema.courses.term, term));

  const rows = await db
    .select({
      id: schema.courses.id,
      listingId: schema.courses.listingId,
      term: schema.courses.term,
      code: schema.courses.code,
      title: schema.courses.title,
    })
    .from(schema.courses)
    .where(and(...conditions))
    .orderBy(desc(schema.courses.term))
    .limit(25);

  if (rows.length === 0) {
    return {
      error: `Course not found for code '${code}'${term ? ` in term ${term}` : ""}.`,
    };
  }

  if (term) {
    if (rows.length === 1) return { value: toResolvedCourse(rows[0]) };
    return {
      error: `Ambiguous course code '${code}' for term ${term}. Provide courseId.`,
      options: rows.slice(0, 10).map(toResolvedCourse),
    };
  }

  const latestTerm = rows[0].term;
  const latestRows = rows.filter((row) => row.term === latestTerm);
  if (latestRows.length === 1) return { value: toResolvedCourse(latestRows[0]) };

  return {
    error: `Ambiguous course code '${code}'. Multiple matches found in latest term ${latestTerm}.`,
    options: latestRows.slice(0, 10).map(toResolvedCourse),
  };
}

export async function resolveCourseById(
  db: NodePgDatabase,
  courseId: string
): Promise<ResolutionResult<ResolvedCourse>> {
  const normalizedId = courseId.trim();
  if (!isValidCourseId(normalizedId)) {
    return {
      error: `Invalid courseId '${courseId}'. Expected format '<listingId>-<term>' (e.g., '002051-1264').`,
    };
  }

  const rows = await db
    .select({
      id: schema.courses.id,
      listingId: schema.courses.listingId,
      term: schema.courses.term,
      code: schema.courses.code,
      title: schema.courses.title,
    })
    .from(schema.courses)
    .where(eq(schema.courses.id, normalizedId))
    .limit(1);

  if (rows.length === 0) {
    return { error: `Course not found for courseId '${courseId}'.` };
  }

  return { value: toResolvedCourse(rows[0]) };
}

export async function resolveListingId(
  db: NodePgDatabase,
  params: { listingId?: string; code?: string; term?: number }
): Promise<ResolutionResult<string>> {
  const { listingId, code, term } = params;
  if (listingId) {
    if (!isValidListingId(listingId)) {
      return {
        error: `Invalid listingId '${listingId}'. Expected numeric listing id like '002051'.`,
      };
    }
    return { value: listingId.trim() };
  }

  if (!code) return { error: "Provide listingId or course code." };
  const resolved = await resolveCourseByCode(db, code, term);
  if (!resolved.value) return { error: resolved.error, options: resolved.options };
  return { value: resolved.value.listingId };
}

export function buildResolutionError(
  error: string,
  options?: unknown[]
): { content: [{ type: "text"; text: string }]; isError: true } {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ error, options: options ?? [] }, null, 2),
      },
    ],
    isError: true,
  };
}

export async function resolveCourseInput(
  db: NodePgDatabase,
  params: { courseId?: string; code?: string; term?: number }
): Promise<ResolutionResult<ResolvedCourse>> {
  const { courseId, code, term } = params;
  if (code) return resolveCourseByCode(db, code, term);
  if (courseId) return resolveCourseById(db, courseId);
  return { error: "Provide courseId or code." };
}

export async function resolveCourseByExactCode(
  db: NodePgDatabase,
  code: string,
  term?: number
): Promise<ResolutionResult<ResolvedCourse>> {
  const normalized = normalizeNoWhitespace(code);
  const conditions = [ilike(schema.courses.code, `%${normalized}%`)];
  if (term) conditions.push(eq(schema.courses.term, term));
  const rows = await db
    .select({
      id: schema.courses.id,
      listingId: schema.courses.listingId,
      term: schema.courses.term,
      code: schema.courses.code,
      title: schema.courses.title,
    })
    .from(schema.courses)
    .where(and(...conditions))
    .orderBy(desc(schema.courses.term))
    .limit(1);
  if (rows.length === 0) return { error: `Course not found for code '${code}'.` };
  return { value: toResolvedCourse(rows[0]) };
}
