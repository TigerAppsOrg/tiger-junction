import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import type { FastifyInstance } from "fastify";
import { build } from "../app.ts";

// These tests exercise routing + the auth boundary only, so the db/service
// plugins are skipped (withDataPlugins: false). SERVICE_API_KEY is set here.
let app: FastifyInstance;
const KEY = "test-service-key";

beforeAll(async () => {
  process.env.SERVICE_API_KEY = KEY;
  app = await build({ logger: false, withDataPlugins: false });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("auth boundary", () => {
  test("health is public", async () => {
    const res = await app.inject({ method: "GET", url: "/health/" });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("ok");
  });

  test("protected route rejects a missing key", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/connect/start",
      payload: {},
    });
    expect(res.statusCode).toBe(401);
  });

  test("protected route rejects a wrong key", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/connect/start",
      headers: { authorization: "Bearer nope" },
      payload: {},
    });
    expect(res.statusCode).toBe(401);
  });

  test("valid key passes auth and reaches validation (400 on empty body)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/connect/start",
      headers: { authorization: `Bearer ${KEY}` },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  test("health stays public with a query string", async () => {
    const res = await app.inject({ method: "GET", url: "/health/?probe=1" });
    expect(res.statusCode).toBe(200);
  });

  test("a public-looking prefix is not public", async () => {
    const res = await app.inject({ method: "GET", url: "/healthz" });
    expect(res.statusCode).toBe(401);
  });
});
