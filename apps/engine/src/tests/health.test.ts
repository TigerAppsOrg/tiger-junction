import { describe, test, expect, afterAll } from "bun:test";
import { getApp, closeApp } from "./setup";

afterAll(async () => {
  await closeApp();
});

describe("GET /health/", () => {
  test("returns 200 with status ok", async () => {
    const app = await getApp();
    const res = await app.inject({ method: "GET", url: "/health/" });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });
});

describe("GET /health/detailed", () => {
  test("returns 200 with system metrics", async () => {
    const app = await getApp();
    const res = await app.inject({ method: "GET", url: "/health/detailed" });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("ok");
    expect(body.uptime).toBeGreaterThanOrEqual(0);
    expect(body.memory).toBeDefined();
    expect(body.memory.heapUsedMB).toBeGreaterThan(0);
    expect(body.nodeVersion).toBeDefined();
    expect(body.platform).toBeDefined();
  });
});
