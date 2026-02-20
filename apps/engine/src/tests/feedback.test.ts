import { describe, test, expect, afterAll } from "bun:test";
import { getApp, closeApp } from "./setup";

afterAll(async () => {
  await closeApp();
});

describe("POST /api/feedback/", () => {
  test("creates feedback", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/feedback/",
      payload: { userId: 1, feedback: "Integration test feedback" },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.feedback).toBe("Integration test feedback");
    expect(body.data.userId).toBe(1);
    expect(body.data.isResolved).toBe(false);
    expect(body.data.createdAt).toBeDefined();
  });

  test("rejects missing userId", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/feedback/",
      payload: { feedback: "No user" },
    });

    expect(res.statusCode).toBe(400);
  });

  test("rejects missing feedback text", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/feedback/",
      payload: { userId: 1 },
    });

    expect(res.statusCode).toBe(400);
  });
});
