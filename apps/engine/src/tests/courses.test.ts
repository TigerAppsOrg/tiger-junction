import { describe, test, expect, afterAll } from "bun:test";
import { getApp, closeApp } from "./setup";

afterAll(async () => {
  await closeApp();
});

describe("GET /api/courses/all", () => {
  test("returns 200 with array of courses", async () => {
    const app = await getApp();
    const res = await app.inject({ method: "GET", url: "/api/courses/all" });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(typeof body.count).toBe("number");
    expect(Array.isArray(body.data)).toBe(true);
  });

  test("courses include instructor data when present", async () => {
    const app = await getApp();
    const res = await app.inject({ method: "GET", url: "/api/courses/all" });
    const body = res.json();

    if (body.data.length > 0) {
      const course = body.data[0];
      expect(course.id).toBeDefined();
      expect(course.code).toBeDefined();
      expect(course.title).toBeDefined();
      expect(course.term).toBeDefined();
      expect(Array.isArray(course.instructors)).toBe(true);
    }
  });
});

describe("GET /api/courses/:term", () => {
  test("returns courses for a valid term", async () => {
    const app = await getApp();
    const res = await app.inject({ method: "GET", url: "/api/courses/1264" });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);

    for (const course of body.data) {
      expect(course.term).toBe(1264);
    }
  });

  test("returns empty array for unknown term", async () => {
    const app = await getApp();
    const res = await app.inject({ method: "GET", url: "/api/courses/9999" });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBe(0);
    expect(body.data).toEqual([]);
  });
});

describe("GET /api/courses/:courseId/sections", () => {
  test("returns sections for a known course", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/courses/002051-1264/sections",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);

    if (body.data.length > 0) {
      const section = body.data[0];
      expect(section.courseId).toBe("002051-1264");
      expect(section.title).toBeDefined();
      expect(typeof section.startTime).toBe("number");
      expect(typeof section.endTime).toBe("number");
    }
  });

  test("returns empty array for unknown course", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/courses/nonexistent-0000/sections",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBe(0);
  });
});
