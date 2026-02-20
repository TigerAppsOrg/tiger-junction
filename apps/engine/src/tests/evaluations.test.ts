import { describe, test, expect, afterAll } from "bun:test";
import { getApp, closeApp } from "./setup";

afterAll(async () => {
  await closeApp();
});

describe("GET /api/evaluations", () => {
  test("returns 200 with array of evaluations", async () => {
    const app = await getApp();
    const res = await app.inject({ method: "GET", url: "/api/evaluations" });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(typeof body.count).toBe("number");
    expect(Array.isArray(body.data)).toBe(true);
  });

  test("evaluation objects have expected shape when data exists", async () => {
    const app = await getApp();
    const res = await app.inject({ method: "GET", url: "/api/evaluations" });
    const body = res.json();

    if (body.data.length > 0) {
      const evaluation = body.data[0];
      expect(evaluation.id).toBeDefined();
      expect(evaluation.courseId).toBeDefined();
      expect(typeof evaluation.courseId).toBe("string");
    }
  });
});

describe("GET /api/evaluations/:courseId", () => {
  test("returns 404 for a non-existent course", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/evaluations/nonexistent-0000",
    });

    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("No evaluations found");
  });

  test("returns evaluation for a known course if data exists", async () => {
    const app = await getApp();

    const allRes = await app.inject({ method: "GET", url: "/api/evaluations" });
    const allBody = allRes.json();

    if (allBody.data.length > 0) {
      const courseId = allBody.data[0].courseId;
      const res = await app.inject({
        method: "GET",
        url: `/api/evaluations/${courseId}`,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.courseId).toBe(courseId);
    }
  });
});
