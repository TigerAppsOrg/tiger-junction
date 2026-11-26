import { test, expect } from "bun:test";
import { McpServer, WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/server";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { registerPublishedCourseTools, type PublishedSource } from "../mcp/tools/published-courses.js";

async function setup(overrides: Partial<PublishedSource> = {}) {
  let calls = 0;
  const source: PublishedSource = {
    async getPublishedTerms() { return [{ code: "1274", name: "Spring 2027" }] as any; },
    async getPublishedCourses(options) { calls++; return { term: [{ code: options.term, name: "Spring 2027", subjects: [{ code: "COS", courses: [{ course_id: "002053", catalog_number: "217", title: "Systems", detail: { description: "C programming" }, instructors: [], classes: [{ section: "L01", schedule: { meetings: [{ days: ["M", "W"], start_time: "10:40 AM", end_time: "11:30 AM" }] } }] }] }] }] } as any; },
    async getCourseDetails(term, courseId) { return { term, course_id: courseId, long_title: "Systems", other_restrictions: "COS 126", enrl_cap: "Use seats endpoint" } as any; },
    ...overrides,
  };
  const server = new McpServer({ name: "published-test", version: "1" });
  registerPublishedCourseTools(server, () => source);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  const client = new Client({ name: "test", version: "1" });
  await client.connect(new StreamableHTTPClientTransport(new URL("https://test/mcp"), { fetch: (url, init) => transport.handleRequest(new Request(url, init)) }));
  return { client, calls: () => calls, close: async () => { await client.close(); await server.close(); } };
}
const data = (result: any) => JSON.parse(result.content[0].text);

test("published term and meetings work without any imported database; reads are cached", async () => {
  const t = await setup();
  try {
    expect(data(await t.client.callTool({ name: "list_published_terms", arguments: {} })).terms[0].code).toBe("1274");
    const args = { term: 1274, department: "COS" };
    const result = data(await t.client.callTool({ name: "search_published_courses", arguments: args }));
    expect(result.courses[0].sections[0].schedule.meetings[0].start_time).toBe("10:40 AM");
    expect(result.fetchedAt).toBeTruthy();
    await t.client.callTool({ name: "search_published_courses", arguments: args });
    expect(t.calls()).toBe(1);
    expect((await t.client.listTools()).tools.every(t => t.annotations?.readOnlyHint)).toBe(true);
  } finally { await t.close(); }
});

test("wrong term and source outages never become an empty current catalog", async () => {
  for (const source of [async () => ({ term: [{ code: "1272", subjects: [] }] } as any), async () => { throw new Error("private-token"); }]) {
    const t = await setup({ getPublishedCourses: source });
    try {
      const result = await t.client.callTool({ name: "search_published_courses", arguments: { term: 1274 } });
      expect(["term_not_returned", "unavailable"]).toContain(data(result).coverage);
      expect(JSON.stringify(result)).not.toContain("private-token");
    } finally { await t.close(); }
  }
});

test("detail validates identity and term and excludes migrated seat fields", async () => {
  const t = await setup();
  try {
    const result = data(await t.client.callTool({ name: "get_published_course", arguments: { term: 1274, courseId: "002053" } }));
    expect(result.details.prerequisitesAndRestrictions).toBe("COS 126");
    expect(JSON.stringify(result)).not.toContain("enrl_cap");
    expect((await t.client.callTool({ name: "get_published_course", arguments: { term: 1274, courseId: "../../secret" } })).isError).toBe(true);
  } finally { await t.close(); }
  const wrong = await setup({ getCourseDetails: async () => ({ term: "1272", course_id: "002053" } as any) });
  try { expect((await wrong.client.callTool({ name: "get_published_course", arguments: { term: 1274, courseId: "002053" } })).isError).toBe(true); }
  finally { await wrong.close(); }
});
