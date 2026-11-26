import { afterEach, expect, test } from "bun:test";
import OIT from "../oit";

const originalFetch = globalThis.fetch;
const originalToken = process.env.API_ACCESS_TOKEN;
const originalKey = process.env.CONSUMER_KEY;
const originalSecret = process.env.CONSUMER_SECRET;

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries({
    API_ACCESS_TOKEN: originalToken,
    CONSUMER_KEY: originalKey,
    CONSUMER_SECRET: originalSecret,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function api(response: unknown) {
  process.env.API_ACCESS_TOKEN = "test-only-token";
  delete process.env.CONSUMER_KEY;
  delete process.env.CONSUMER_SECRET;
  globalThis.fetch = (async () => Response.json(response)) as unknown as typeof fetch;
  return new OIT();
}

// Captured response shape for CTL, term 1274, from the production OIT API.
const emptyDepartment = {
  term: [{ code: null, name: null, start_date: null, end_date: null }],
};

test("an empty CTL department does not abort the entire term import", async () => {
  expect(await api(emptyDepartment).getDeptCourses("1274", "CTL")).toEqual([]);
});

test("selects the requested term and department, including crosslisted responses", async () => {
  const courses = [{ course_id: "002051", title: "Intro to CS" }];
  const oit = api({
    term: [
      { code: "1272", subjects: [{ code: "COS", courses: [] }] },
      {
        code: "1274",
        subjects: [
          { code: "CEE", courses: [] },
          { code: "COS", courses },
        ],
      },
    ],
  });
  expect((await oit.getDeptCourses("1274", "COS")).map((course) => course.course_id)).toEqual([
    "002051",
  ]);
});

test("rejects wrong-term course data instead of importing it under Spring", async () => {
  const oit = api({ term: [{ code: "1272", subjects: [] }] });
  await expect(oit.getDeptCourses("1274", "COS")).rejects.toThrow("wrong term");
});

test("malformed responses are failures, not empty departments", async () => {
  for (const response of [
    {},
    { term: [{}] },
    { term: [{ code: "1274" }] },
    { term: [{ code: "1274", subjects: [{ code: "COS" }] }] },
  ]) {
    await expect(api(response).getDeptCourses("1274", "COS")).rejects.toThrow();
  }
});

test("empty or wrong-term department lists cannot report a successful catalog import", async () => {
  for (const response of [
    emptyDepartment,
    { term: [] },
    { term: [{ code: "1274", subjects: [] }] },
    { term: [{ code: "1272", subjects: [] }] },
  ]) {
    await expect(api(response).getAllCourseData("1274")).rejects.toThrow();
  }
});

test("an empty department does not prevent later departments from being fetched", async () => {
  const oit = api(emptyDepartment);
  const seen: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const subject = new URL(String(input)).searchParams.get("subject")!;
    seen.push(subject);
    if (subject === "list")
      return Response.json({
        term: [
          {
            subjects: [
              { code: "CTL", courses: [] },
              { code: "ECO", courses: [] },
            ],
          },
        ],
      });
    return Response.json(
      subject === "CTL"
        ? emptyDepartment
        : {
            term: [{ code: "1274", subjects: [{ code: "ECO", courses: [] }] }],
          }
    );
  }) as unknown as typeof fetch;
  await oit.getAllCourseData("1274");
  expect(seen).toEqual(["list", "CTL", "ECO"]);
});

test("accepts OIT's unscoped subject directory but rejects invalid entries", async () => {
  expect(
    await api({
      term: [
        {
          subjects: [
            { code: "ECO", name: "Economics", courses: [] },
            { code: "COS", name: "Computer Science", courses: [] },
          ],
        },
      ],
    }).getRegDepartments("1274")
  ).toEqual(["COS", "ECO"]);
  await expect(api({ term: [{ subjects: [{}] }] }).getRegDepartments("1274")).rejects.toThrow(
    "Invalid OIT department directory"
  );
});
