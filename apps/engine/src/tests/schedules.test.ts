import { describe, test, expect, afterAll, beforeAll } from "bun:test";
import { getApp, closeApp } from "./setup";

let testScheduleId: number;

afterAll(async () => {
  await closeApp();
});

describe("POST /api/schedules/", () => {
  test("creates a new schedule", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/schedules/",
      payload: { userId: 1, term: 1264, title: "Test Schedule", relativeId: 99 },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.title).toBe("Test Schedule");
    expect(body.data.term).toBe(1264);
    expect(body.data.userId).toBe(1);
    testScheduleId = body.data.id;
  });

  test("rejects missing required fields", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/schedules/",
      payload: { userId: 1 },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe("GET /api/schedules/:scheduleId", () => {
  test("returns the created schedule", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "GET",
      url: `/api/schedules/${testScheduleId}`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(testScheduleId);
    expect(body.data.title).toBe("Test Schedule");
  });

  test("returns 404 for nonexistent schedule", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/schedules/999999",
    });

    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.success).toBe(false);
  });
});

describe("PATCH /api/schedules/:scheduleId", () => {
  test("updates the schedule title", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "PATCH",
      url: `/api/schedules/${testScheduleId}`,
      payload: { title: "Renamed Schedule" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.title).toBe("Renamed Schedule");
  });

  test("returns 404 for nonexistent schedule", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "PATCH",
      url: "/api/schedules/999999",
      payload: { title: "Nope" },
    });

    expect(res.statusCode).toBe(404);
  });
});

describe("Schedule ↔ Course associations", () => {
  test("POST adds a course to the schedule", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "POST",
      url: `/api/schedules/${testScheduleId}/courses`,
      payload: { courseId: "002051-1264", color: 3 },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.scheduleId).toBe(testScheduleId);
    expect(body.data.courseId).toBe("002051-1264");
    expect(body.data.color).toBe(3);
  });

  test("GET returns course associations", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "GET",
      url: `/api/schedules/${testScheduleId}/courses`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBeGreaterThanOrEqual(1);
    expect(body.data[0].courseId).toBe("002051-1264");
  });

  test("PATCH updates course metadata", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "PATCH",
      url: `/api/schedules/${testScheduleId}/courses/002051-1264`,
      payload: { color: 5, isComplete: true },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.color).toBe(5);
    expect(body.data.isComplete).toBe(true);
  });

  test("DELETE removes the course association", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "DELETE",
      url: `/api/schedules/${testScheduleId}/courses/002051-1264`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);

    const check = await app.inject({
      method: "GET",
      url: `/api/schedules/${testScheduleId}/courses`,
    });
    expect(check.json().count).toBe(0);
  });
});

describe("POST /api/schedules/:id/courses/bulk", () => {
  test("bulk adds multiple courses", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "POST",
      url: `/api/schedules/${testScheduleId}/courses/bulk`,
      payload: {
        courses: [
          { courseId: "002051-1264", color: 0 },
          { courseId: "002054-1264", color: 1 },
        ],
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBe(2);
  });

  test("DELETE clears all courses from schedule", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "DELETE",
      url: `/api/schedules/${testScheduleId}/courses`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().count).toBe(2);
  });
});

describe("DELETE /api/schedules/:scheduleId", () => {
  test("deletes the schedule", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "DELETE",
      url: `/api/schedules/${testScheduleId}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);

    const check = await app.inject({
      method: "GET",
      url: `/api/schedules/${testScheduleId}`,
    });
    expect(check.statusCode).toBe(404);
  });
});
