import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import OIT from "../../oit/index.js";
import type { OIT_CoursesResponse, OIT_CourseDetails, OIT_Term } from "../../oit/types.js";

export type PublishedSource = {
  getPublishedTerms(): Promise<OIT_Term[]>;
  getPublishedCourses(options: { term: string; subject?: string; search?: string }): Promise<OIT_CoursesResponse>;
  getCourseDetails(term: string, courseId: string): Promise<OIT_CourseDetails>;
};
const term = z.number().int().min(1000).max(1999).refine(n => [2, 4].includes(n % 10), "Use a Fall or Spring term");
const department = z.string().regex(/^[A-Z]{3}$/);
const cache = new Map<string, { expires: number; value: unknown; fetchedAt: string }>();
let source: OIT | undefined;
const defaultSource = () => source ??= new OIT();

export function registerPublishedCourseTools(server: McpServer, getSource: () => PublishedSource = defaultSource) {
  // Shared cache only for public catalog data. Never cache user plans or identity.
  const localCache = getSource === defaultSource ? cache : new Map<string, { expires: number; value: unknown; fetchedAt: string }>();
  async function read<T>(key: string, load: () => Promise<T>) {
    const hit = localCache.get(key);
    if (hit && hit.expires > Date.now()) return { data: hit.value as T, fetchedAt: hit.fetchedAt };
    const data = await load();
    const fetchedAt = new Date().toISOString();
    if (localCache.size >= 64) localCache.delete(localCache.keys().next().value!);
    localCache.set(key, { expires: Date.now() + 300_000, value: data, fetchedAt });
    return { data, fetchedAt };
  }
  const output = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data) }] });
  const guard = async (fn: () => Promise<unknown>) => {
    try { return output(await fn()); }
    catch { return { isError: true, ...output({ coverage: "unavailable", message: "The official Princeton course API is unavailable. Check the engine OIT credential configuration or try later. This does not mean there are no offerings." }) }; }
  };
  const annotations = { readOnlyHint: true, destructiveHint: false, openWorldHint: true };
  const sourceUrl = "https://registrar.princeton.edu/course-offerings";

  server.registerTool("list_published_terms", {
    description: "Read terms published by Princeton now, independently of the imported TigerJunction database. Not an inventory of all historical terms. Includes fetch time and source.",
    inputSchema: z.object({}), annotations,
  }, () => guard(async () => {
    const result = await read("terms", () => getSource().getPublishedTerms());
    if (!Array.isArray(result.data) || result.data.some(t => !/^\d{4}$/.test(t.code))) throw new Error("Invalid terms");
    return { source: "Princeton OIT", sourceUrl, fetchedAt: result.fetchedAt, cacheMaxAgeSeconds: 300, coverage: "published_terms_only", terms: result.data };
  }));

  server.registerTool("search_published_courses", {
    description: "Search Princeton's live official offerings for an explicit term, across any department. Bypasses stale imported catalogs. Includes source, fetch time, instructors and published section meetings. Use get_published_course for details and prerequisite text. Counts are for this query, not a completeness guarantee for the university.",
    inputSchema: z.object({ term, department: department.optional(), query: z.string().trim().min(1).max(100).optional(), limit: z.number().int().min(1).max(30).default(15), offset: z.number().int().min(0).max(10000).default(0) }), annotations,
  }, args => guard(async () => {
    const result = await read(JSON.stringify([args.term, args.department, args.query]), () => getSource().getPublishedCourses({ term: String(args.term), subject: args.department, search: args.query }));
    if (!Array.isArray(result.data?.term)) throw new Error("Invalid catalog");
    const selected = result.data.term.find(t => t.code === String(args.term));
    if (!selected) return { sourceUrl, fetchedAt: result.fetchedAt, term: args.term, coverage: "term_not_returned", courses: [], warning: "Requested term not returned by the source. Do not substitute another term." };
    if (!Array.isArray(selected.subjects) || selected.subjects.some(s => !Array.isArray(s.courses))) throw new Error("Invalid subjects");
    const all = selected.subjects.flatMap(s => s.courses.map(c => ({ ...c, department: s.code })));
    const unique = [...new Map(all.map(c => [c.course_id, c])).values()];
    return { source: "Princeton OIT", sourceUrl, fetchedAt: result.fetchedAt, cacheMaxAgeSeconds: 300, term: args.term, termName: selected.name, coverage: "query_results", total: unique.length, nextOffset: args.offset + args.limit < unique.length ? args.offset + args.limit : null,
      courses: unique.slice(args.offset, args.offset + args.limit).map(c => ({ courseId: c.course_id, department: c.department, number: c.catalog_number, title: c.title, description: c.detail?.description, instructors: c.instructors?.map(i => i.full_name), crosslistings: c.crosslistings, sections: c.classes?.map(s => ({ section: s.section, classNumber: s.class_number, type: s.type_name, schedule: s.schedule })), sourceUrl: `${sourceUrl}/course-details?term=${args.term}&courseid=${c.course_id}` })),
      warning: "Meeting times are as published, timezone America/New_York. Missing times are unknown. Seat availability and saved-plan validation require separate checks." };
  }));

  server.registerTool("get_published_course", {
    description: "Read official course description, prerequisite/restriction text, grading and distribution information for an explicit term and six-digit courseId returned by search_published_courses. Not an eligibility or seat guarantee.",
    inputSchema: z.object({ term, courseId: z.string().regex(/^\d{6}$/) }), annotations,
  }, args => guard(async () => {
    const result = await read(`details:${args.term}:${args.courseId}`, () => getSource().getCourseDetails(String(args.term), args.courseId));
    if (!result.data || result.data.course_id !== args.courseId || result.data.term !== String(args.term)) throw new Error("Invalid detail");
    // Old OIT enrollment fields may contain migration messages. Never expose
    // them as live seat counts. The source detail text is not executable advice.
    const d = result.data;
    return { source: "Princeton OIT", sourceUrl: `${sourceUrl}/course-details?term=${args.term}&courseid=${args.courseId}`, fetchedAt: result.fetchedAt, cacheMaxAgeSeconds: 300, term: args.term, courseId: args.courseId, coverage: "course_details", details: { title: d.long_title, description: d.description, crosslistings: d.crosslistings, distribution: d.distribution_area_short, prerequisitesAndRestrictions: d.other_restrictions, gradingBasis: d.grading_basis, instructors: d.course_instructors }, warning: "Prerequisites require checking the student's completed courses. No verified enrollment counts or registration eligibility." };
  }));
}
