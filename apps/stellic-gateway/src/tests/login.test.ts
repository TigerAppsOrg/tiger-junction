import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { StellicLogin } from "../stellic/login.ts";
import {
  NeedsReconnectError,
  PushNotApprovedError,
  PushPendingError,
} from "../stellic/errors.ts";

// A local stand-in for Duo's prompt API. Push-status requests answer with the
// next scripted reply; "hang" holds the request open and never answers. Like
// real Duo, finalize_auth fails until the trust prompt has been answered.
let server: ReturnType<typeof Bun.serve>;
let origin: string;
let base: string;
let replies: ("hang" | "slow" | "STATUS" | "SUCCESS" | "EXPIRED")[] = [];
let statusCalls = 0;
let calls: { path: string; body: unknown }[] = [];
// What Duo sends once the student approves the push.
const approved = {
  result: "SUCCESS",
  auth_result: { authn_evaluation: { is_allowed: true, status_enum: 5 } },
};

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    async fetch(req) {
      const path = new URL(req.url).pathname.replace("/prompt/akey", "");
      const body = req.method === "POST" ? await req.json() : null;
      calls.push({ path, body });
      if (path === "/auth/browser_trust" || path === "/auth/remember_me") {
        return Response.json({ stat: "OK", response: {} });
      }
      if (path === "/auth/finalize_auth") {
        const answered = calls.some((c) => c.path === "/auth/remember_me");
        return Response.json(
          answered
            ? { stat: "OK", response: { url: `${origin}/exit` } }
            : { stat: "FAIL", response: {} },
        );
      }
      if (path === "/exit") {
        // Not a SAML page; the test only cares that finalize_auth succeeded.
        return new Response("<html></html>");
      }
      if (path !== "/auth/factors/push/status") {
        return new Response("not found", { status: 404 });
      }
      statusCalls++;
      const reply = replies.shift() ?? "hang";
      if (reply === "hang") return new Promise<Response>(() => {});
      if (reply === "EXPIRED") {
        // What Duo sends when an unanswered push expires: "SUCCESS", not allowed.
        return Response.json({
          stat: "OK",
          response: {
            result: {
              result: "SUCCESS",
              auth_result: { authn_evaluation: { is_allowed: false } },
            },
          },
        });
      }
      if (reply === "slow") {
        // Held open, then approved: Duo's long poll answering late.
        await Bun.sleep(400);
        return Response.json({
          stat: "OK",
          response: { result: approved },
        });
      }
      return Response.json({
        stat: "OK",
        response: {
          result: reply === "SUCCESS" ? approved : { result: reply },
        },
      });
    },
  });
  origin = `http://localhost:${server.port}`;
  base = `${origin}/prompt/akey`;
});

afterAll(() => {
  server.stop(true);
});

// A login as it stands after start() sent the push, pointed at the fake Duo.
function loginAwaitingPush(timeoutMs: number) {
  const login = new StellicLogin("a", { timeoutMs });
  Object.assign(login, { duoBase: base, authkey: "k", txid: "tx" });
  return login as unknown as {
    waitForPush(ms: number): Promise<void>;
    finish(ms: number): Promise<unknown>;
  };
}

function reset(next: typeof replies) {
  replies = next;
  statusCalls = 0;
  calls = [];
}

describe("StellicLogin push wait", () => {
  test("a status request Duo holds open is waited on, past the usual timeout", async () => {
    reset(["slow"]);
    // Per-request timeout 200 ms; Duo answers after 400 ms.
    await loginAwaitingPush(200).waitForPush(5000);
    expect(statusCalls).toBe(1);
  });

  test("still unanswered at the deadline is reported as pending", async () => {
    reset([]);
    const err = await loginAwaitingPush(200)
      .waitForPush(500)
      .catch((e) => e);
    expect(err).toBeInstanceOf(PushPendingError);
  });

  test("an approved push answers the trust prompt before finalizing", async () => {
    reset(["SUCCESS"]);
    const err = await loginAwaitingPush(1000)
      .finish(5000)
      .catch((e) => e);
    // Duo accepted finalize_auth; the login only stops at the fake exit page.
    expect(err).toBeInstanceOf(NeedsReconnectError);
    expect(calls.map((c) => c.path)).toEqual([
      "/auth/factors/push/status",
      "/auth/browser_trust",
      "/auth/remember_me",
      "/auth/finalize_auth",
      "/exit",
    ]);
    expect(calls[1].body).toEqual({ authkey: "k", is_trusted: false });
  });

  test("a push that expires unanswered is not taken as approved", async () => {
    reset(["STATUS", "EXPIRED"]);
    const err = await loginAwaitingPush(1000)
      .finish(5000)
      .catch((e) => e);
    expect(err).toBeInstanceOf(PushNotApprovedError);
    // It stops there: no trust prompt, no finalize.
    expect(calls.map((c) => c.path)).toEqual([
      "/auth/factors/push/status",
      "/auth/factors/push/status",
    ]);
  });
});
