import { describe, test, expect, afterAll } from "bun:test";
import { getApp, closeApp } from "./setup";

afterAll(async () => {
  await closeApp();
});

describe("GET /api/users/:userId/schedules", () => {
  test("returns schedules for existing user", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/users/1/schedules",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);

    for (const sched of body.data) {
      expect(sched.userId).toBe(1);
    }
  });

  test("filters by term query param", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/users/1/schedules?term=1264",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);

    for (const sched of body.data) {
      expect(sched.term).toBe(1264);
    }
  });

  test("returns empty for nonexistent user", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/users/999999/schedules",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().count).toBe(0);
  });

  test("rejects non-numeric userId", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/users/abc/schedules",
    });

    expect(res.statusCode).toBe(400);
  });
});

describe("GET /api/users/:userId/events", () => {
  test("returns events for existing user", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/users/1/events",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);

    for (const ev of body.data) {
      expect(ev.userId).toBe(1);
    }
  });

  test("returns empty for nonexistent user", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/users/999999/events",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().count).toBe(0);
  });
});
