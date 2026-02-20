import { describe, test, expect, afterAll } from "bun:test";
import { getApp, closeApp } from "./setup";

let testEventId: number;
let testScheduleId: number;

afterAll(async () => {
  const app = await getApp();

  // Cleanup: remove schedule-event link, then event, then schedule
  if (testScheduleId && testEventId) {
    await app.inject({
      method: "DELETE",
      url: `/api/schedules/${testScheduleId}/events/${testEventId}`,
    });
  }
  if (testEventId) {
    await app.inject({ method: "DELETE", url: `/api/events/${testEventId}` });
  }
  if (testScheduleId) {
    await app.inject({ method: "DELETE", url: `/api/schedules/${testScheduleId}` });
  }

  await closeApp();
});

describe("POST /api/events/", () => {
  test("creates a custom event", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/events/",
      payload: {
        userId: 1,
        title: "Test Event",
        times: { monday: { start: "09:00", end: "10:30" } },
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.title).toBe("Test Event");
    expect(body.data.userId).toBe(1);
    testEventId = body.data.id;
  });

  test("rejects missing required fields", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/events/",
      payload: { userId: 1 },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe("PATCH /api/events/:eventId", () => {
  test("updates the event title", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "PATCH",
      url: `/api/events/${testEventId}`,
      payload: { title: "Renamed Event" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.title).toBe("Renamed Event");
  });

  test("returns 404 for nonexistent event", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "PATCH",
      url: "/api/events/999999",
      payload: { title: "Nope" },
    });

    expect(res.statusCode).toBe(404);
  });
});

describe("Schedule ↔ Event associations", () => {
  test("setup: create a schedule for linking", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/schedules/",
      payload: { userId: 1, term: 1264, title: "Events Test Schedule", relativeId: 98 },
    });
    testScheduleId = res.json().data.id;
    expect(testScheduleId).toBeDefined();
  });

  test("POST links event to schedule", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "POST",
      url: `/api/schedules/${testScheduleId}/events`,
      payload: { eventId: testEventId },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.scheduleId).toBe(testScheduleId);
    expect(body.data.customEventId).toBe(testEventId);
  });

  test("GET /api/schedules/:id/events returns the link", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "GET",
      url: `/api/schedules/${testScheduleId}/events`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().count).toBe(1);
  });

  test("GET /api/events/:id/schedules returns the link", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "GET",
      url: `/api/events/${testEventId}/schedules`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().count).toBeGreaterThanOrEqual(1);
  });

  test("DELETE removes event from schedule", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "DELETE",
      url: `/api/schedules/${testScheduleId}/events/${testEventId}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);
  });
});

describe("DELETE /api/events/:eventId", () => {
  test("deletes the event", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "DELETE",
      url: `/api/events/${testEventId}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);

    const check = await app.inject({
      method: "DELETE",
      url: `/api/events/${testEventId}`,
    });
    expect(check.statusCode).toBe(404);
  });
});
