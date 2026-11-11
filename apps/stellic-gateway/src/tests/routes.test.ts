import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import type { FastifyInstance } from "fastify";
import { build } from "../app.ts";
import type { ConnectionService } from "../service.ts";
import { NotFoundError } from "../service.ts";
import {
  PushNotApprovedError,
  PushPendingError,
  StellicLoginError,
} from "../stellic/errors.ts";

// Routes against a stub service, to check how service outcomes map to HTTP.
let app: FastifyInstance;
const KEY = "test-service-key";
const auth = { authorization: `Bearer ${KEY}` };

const stub = {
  async startConnect(netid: string, password: string) {
    if (password === "wrong") {
      throw new StellicLoginError("CAS login failed: bad credentials");
    }
    return {
      connectionToken: "tok",
      challenge: {
        device: "iPhone",
        verificationCode: "123",
        pushNeeded: true,
      },
    };
  },
  async finishConnect(token: string, netid: string) {
    if (token === "pending") throw new PushPendingError();
    if (token === "expired") throw new PushNotApprovedError();
    if (netid !== "a") throw new NotFoundError("Unknown token");
    return { netid };
  },
};

beforeAll(async () => {
  process.env.SERVICE_API_KEY = KEY;
  app = await build({ logger: false, withDataPlugins: false });
  app.decorate("service", stub as unknown as ConnectionService);
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("connect routes", () => {
  test("start returns the push challenge", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/connect/start",
      headers: auth,
      payload: { netid: "a", password: "pw" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      connectionToken: "tok",
      device: "iPhone",
      verificationCode: "123",
      pushNeeded: true,
    });
  });

  test("a CAS failure is a 502 with the reason", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/connect/start",
      headers: auth,
      payload: { netid: "a", password: "wrong" },
    });
    expect(res.statusCode).toBe(502);
    expect(res.json().detail).toMatch(/bad credentials/);
  });

  test("finish requires the netid", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/connect/finish",
      headers: auth,
      payload: { connectionToken: "tok" },
    });
    expect(res.statusCode).toBe(400);
  });

  test("finish reports an unapproved push as 202 pending", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/connect/finish",
      headers: auth,
      payload: { connectionToken: "pending", netid: "a" },
    });
    expect(res.statusCode).toBe(202);
    expect(res.json()).toEqual({ status: "pending" });
  });

  test("finish reports an expired push as 410 with a message for the student", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/connect/finish",
      headers: auth,
      payload: { connectionToken: "expired", netid: "a" },
    });
    expect(res.statusCode).toBe(410);
    expect(res.json()).toEqual({
      error: "push_not_approved",
      detail: "Your Duo push expired or was declined. Please try again.",
    });
  });

  test("finish succeeds for the matching netid", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/connect/finish",
      headers: auth,
      payload: { connectionToken: "tok", netid: "a" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ netid: "a", status: "active" });
  });

  test("an unknown or mismatched token is a 404", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/connect/finish",
      headers: auth,
      payload: { connectionToken: "tok", netid: "b" },
    });
    expect(res.statusCode).toBe(404);
  });
});
