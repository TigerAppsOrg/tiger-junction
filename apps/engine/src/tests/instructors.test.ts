import { describe, test, expect, afterAll } from "bun:test";
import { getApp, closeApp } from "./setup";

afterAll(async () => {
  await closeApp();
});

describe("GET /api/instructors/", () => {
  test("returns 200 with array of instructors", async () => {
    const app = await getApp();
    const res = await app.inject({ method: "GET", url: "/api/instructors/" });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(typeof body.count).toBe("number");
    expect(Array.isArray(body.data)).toBe(true);

    if (body.data.length > 0) {
      const inst = body.data[0];
      expect(inst.netid).toBeDefined();
      expect(inst.name).toBeDefined();
    }
  });
});

describe("GET /api/instructors/:netid", () => {
  test("returns 404 for unknown netid", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/instructors/nonexistent_netid",
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().success).toBe(false);
  });

  test("returns instructor for known netid", async () => {
    const app = await getApp();

    // First get any instructor netid from the list
    const listRes = await app.inject({ method: "GET", url: "/api/instructors/" });
    const list = listRes.json();
    if (list.data.length === 0) return; // skip if DB empty

    const netid = list.data[0].netid;
    const res = await app.inject({
      method: "GET",
      url: `/api/instructors/${netid}`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.netid).toBe(netid);
    expect(body.data.name).toBeDefined();
    expect(body.data.fullName).toBeDefined();
  });
});
