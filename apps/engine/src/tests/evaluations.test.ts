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
      expect(evaluation.listingId).toBeDefined();
      expect(typeof evaluation.listingId).toBe("string");
      expect(evaluation.evalTerm).toBeDefined();
      expect(typeof evaluation.evalTerm).toBe("string");
    }
  });
});

describe("GET /api/evaluations/:listingId", () => {
  test("returns 404 for a non-existent listing", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/evaluations/nonexistent",
    });

    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("No evaluations found");
  });

  test("returns evaluations for a known listing if data exists", async () => {
    const app = await getApp();

    const allRes = await app.inject({ method: "GET", url: "/api/evaluations" });
    const allBody = allRes.json();

    if (allBody.data.length > 0) {
      const listingId = allBody.data[0].listingId;
      const res = await app.inject({
        method: "GET",
        url: `/api/evaluations/${listingId}`,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.count).toBeGreaterThan(0);
      expect(Array.isArray(body.data)).toBe(true);
      for (const evaluation of body.data) {
        expect(evaluation.listingId).toBe(listingId);
      }
    }
  });
});
