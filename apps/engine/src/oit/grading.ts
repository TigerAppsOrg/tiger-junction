import type { OIT_CourseDetails } from "./types.js";

export type GradingCategory = "exam" | "pset" | "paper" | "project" | "participation" | "other";

export interface GradingComponent {
  key: string;
  label: string;
  category: GradingCategory;
  percent: number;
}

export interface CourseGradingSummary {
  known: boolean;
  totalPct: number;
  examPct: number | null;
  psetPct: number | null;
  hasSeatedFinal: boolean | null;
  hasAnyExam: boolean | null;
  breakdown: GradingComponent[];
}

export interface ReadingListItem {
  author: string | null;
  title: string | null;
}

export interface SeatReservation {
  classSection: string;
  description: string;
  enrlCap: string;
}

export interface CourseDetailsMetadata {
  source: "princeton_oit_course_details";
  fetchedAt: string;
  grading: CourseGradingSummary;
  webAddress: string | null;
  otherRestrictions: string | null;
  otherRequirements: string | null;
  otherInformation: string | null;
  readingWritingAssignment: string | null;
  addConsent: string | null;
  dropConsent: string | null;
  readingList: ReadingListItem[];
  seatReservations: SeatReservation[];
}

interface GradingFieldSpec {
  key: keyof OIT_CourseDetails;
  label: string;
  category: GradingCategory;
}

export const OIT_GRADING_FIELDS: readonly GradingFieldSpec[] = [
  { key: "grading_final_exam", label: "Final exam", category: "exam" },
  { key: "grading_mid_exam", label: "Midterm exam", category: "exam" },
  { key: "grading_home_final_exam", label: "Take-home final exam", category: "exam" },
  { key: "grading_home_mid_exam", label: "Take-home midterm exam", category: "exam" },
  { key: "grading_other_exam", label: "Other exam", category: "exam" },
  { key: "grading_quizzes", label: "Quizzes", category: "exam" },
  { key: "grading_prob_sets", label: "Problem sets", category: "pset" },
  { key: "grading_prog_assign", label: "Programming assignments", category: "pset" },
  { key: "grading_paper_final_exam", label: "Paper in lieu of final", category: "paper" },
  { key: "grading_paper_mid_exam", label: "Paper in lieu of midterm", category: "paper" },
  { key: "grading_papers", label: "Papers", category: "paper" },
  { key: "grading_term_papers", label: "Term papers", category: "paper" },
  { key: "grading_design_projects", label: "Design projects", category: "project" },
  { key: "grading_lab_reports", label: "Lab reports", category: "project" },
  { key: "pu_projects", label: "Projects", category: "project" },
  { key: "grading_precept_part", label: "Class/precept participation", category: "participation" },
  { key: "grading_oral_pres", label: "Oral presentations", category: "participation" },
  {
    key: "pu_pres_final_exam",
    label: "Final presentation or performance",
    category: "participation",
  },
  { key: "grading_other", label: "Other", category: "other" },
] as const;

export function parseOitPercent(raw: unknown): number {
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 0;
  }
  if (typeof raw !== "string") return 0;
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.round(parsed);
}

function cleanText(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Summarize all 19 Princeton OIT grading fields.
 * Unknown/unreported grading (totalPct === 0) keeps examPct/psetPct as null so
 * missing metadata is never mistaken for 0% exams.
 */
export function summarizeCourseGrading(details: Partial<OIT_CourseDetails>): CourseGradingSummary {
  const breakdown: GradingComponent[] = [];
  let totalPct = 0;
  let examPct = 0;
  let psetPct = 0;

  for (const spec of OIT_GRADING_FIELDS) {
    const pct = parseOitPercent(details[spec.key]);
    if (pct <= 0) continue;
    totalPct += pct;
    if (spec.category === "exam") examPct += pct;
    if (spec.category === "pset") psetPct += pct;
    breakdown.push({
      key: String(spec.key),
      label: spec.label,
      category: spec.category,
      percent: pct,
    });
  }

  breakdown.sort((a, b) => b.percent - a.percent || a.label.localeCompare(b.label));

  if (totalPct <= 0) {
    return {
      known: false,
      totalPct: 0,
      examPct: null,
      psetPct: null,
      hasSeatedFinal: null,
      hasAnyExam: null,
      breakdown: [],
    };
  }

  const seatedFinalPct = parseOitPercent(details.grading_final_exam);

  return {
    known: true,
    totalPct,
    examPct,
    psetPct,
    hasSeatedFinal: seatedFinalPct > 0,
    hasAnyExam: examPct > 0,
    breakdown,
  };
}

export function extractReadingList(details: Partial<OIT_CourseDetails>): ReadingListItem[] {
  const items: ReadingListItem[] = [];
  const rec = details as Record<string, unknown>;
  for (let i = 1; i <= 6; i++) {
    const author = cleanText(rec[`reading_list_author_${i}`]);
    const title = cleanText(rec[`reading_list_title_${i}`]);
    if (author || title) {
      items.push({ author, title });
    }
  }
  return items;
}

export function extractSeatReservations(details: Partial<OIT_CourseDetails>): SeatReservation[] {
  const raw = details.seat_reservations?.seat_reservation;
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => ({
      classSection: cleanText(entry.class_section) ?? "",
      description: cleanText(entry.description) ?? "",
      enrlCap: cleanText(entry.enrl_cap) ?? "",
    }))
    .filter((entry) => entry.classSection || entry.description || entry.enrlCap);
}

export function extractCourseDetailsMetadata(
  details: Partial<OIT_CourseDetails>,
  fetchedAt: Date = new Date()
): CourseDetailsMetadata {
  return {
    source: "princeton_oit_course_details",
    fetchedAt: fetchedAt.toISOString(),
    grading: summarizeCourseGrading(details),
    webAddress: cleanText(details.web_address),
    otherRestrictions: cleanText(details.other_restrictions),
    otherRequirements: cleanText(details.other_requirements),
    otherInformation: cleanText(details.other_information),
    readingWritingAssignment: cleanText(details.reading_writing_assignment),
    addConsent: cleanText(details.add_consent),
    dropConsent: cleanText(details.drop_consent),
    readingList: extractReadingList(details),
    seatReservations: extractSeatReservations(details),
  };
}

export interface StoredCourseGradingRow {
  gradingKnown?: boolean | null;
  examPct?: number | null;
  psetPct?: number | null;
  hasFinal?: boolean | null;
  detailsJson?: unknown;
}

/**
 * Reconstruct a safe grading summary from a DB course row (including legacy rows
 * imported before detailsJson was populated).
 */
export function readStoredGrading(row: StoredCourseGradingRow): CourseGradingSummary {
  const meta =
    row.detailsJson && typeof row.detailsJson === "object"
      ? (row.detailsJson as Partial<CourseDetailsMetadata>)
      : null;

  if (meta?.grading && typeof meta.grading.known === "boolean") {
    return meta.grading;
  }

  if (row.gradingKnown) {
    const examPct = typeof row.examPct === "number" ? row.examPct : null;
    const psetPct = typeof row.psetPct === "number" ? row.psetPct : null;
    return {
      known: true,
      totalPct: (examPct ?? 0) + (psetPct ?? 0),
      examPct,
      psetPct,
      hasSeatedFinal: typeof row.hasFinal === "boolean" ? row.hasFinal : null,
      hasAnyExam: examPct != null ? examPct > 0 : null,
      breakdown: [],
    };
  }

  return {
    known: false,
    totalPct: 0,
    examPct: null,
    psetPct: null,
    hasSeatedFinal: null,
    hasAnyExam: null,
    breakdown: [],
  };
}

export function readStoredDetailsMetadata(detailsJson: unknown): CourseDetailsMetadata | null {
  if (!detailsJson || typeof detailsJson !== "object") return null;
  const candidate = detailsJson as Partial<CourseDetailsMetadata>;
  if (candidate.source !== "princeton_oit_course_details") return null;
  return candidate as CourseDetailsMetadata;
}
