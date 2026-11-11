import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { CookieClient, HttpError } from "../stellic/http.ts";

// A local server standing in for CAS/Stellic, to exercise redirects, cookies
// and timeouts without the network.
let server: ReturnType<typeof Bun.serve>;
let base: string;

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    fetch(req) {
      const url = new URL(req.url);
      switch (url.pathname) {
        case "/login":
          // POST -> 302 sets a cookie and must continue as a bodyless GET.
          return new Response("ignored redirect body", {
            status: 302,
            headers: {
              Location: "/landing",
              "Set-Cookie": "sid=abc; Path=/",
            },
          });
        case "/landing":
          return Response.json({
            method: req.method,
            cookie: req.headers.get("cookie"),
            contentType: req.headers.get("content-type"),
          });
        case "/loop":
          return new Response(null, {
            status: 302,
            headers: { Location: "/loop" },
          });
        case "/stall":
          // Headers arrive at once; the body never finishes.
          return new Response(
            new ReadableStream({
              start(controller) {
                controller.enqueue(new TextEncoder().encode("partial"));
              },
            }),
          );
        case "/hang":
          // No response at all, like a long poll that never answers.
          return new Promise<Response>(() => {});
        default:
          return new Response("not found", { status: 404 });
      }
    },
  });
  base = `http://localhost:${server.port}`;
});

afterAll(() => {
  server.stop(true);
});

function client(timeoutMs = 2000): CookieClient {
  return new CookieClient({ userAgent: "test", timeoutMs });
}

describe("CookieClient", () => {
  test("follows a POST redirect as GET and carries cookies across hops", async () => {
    const c = client();
    const res = await c.post(`${base}/login`, { form: { a: "1" } });
    expect(res.url).toBe(`${base}/landing`);
    expect(res.history).toEqual([302]);
    expect(JSON.parse(res.text)).toEqual({
      method: "GET",
      cookie: "sid=abc",
      contentType: null,
    });
    expect(await c.jar.getCookieString(base)).toBe("sid=abc");
  });

  test("gives up on a redirect loop", async () => {
    await expect(client().get(`${base}/loop`)).rejects.toThrow(
      /exceeded 20 redirects/,
    );
  });

  test("times out a body that never finishes", async () => {
    const started = Date.now();
    const err = await client(300)
      .get(`${base}/stall`)
      .catch((e) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(err.message).toMatch(/timed out after 300 ms/);
    expect(Date.now() - started).toBeLessThan(2000);
  });

  test("a per-request timeout overrides the default and is flagged as a timeout", async () => {
    const err = await client(5000)
      .get(`${base}/hang`, { timeoutMs: 300 })
      .catch((e) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(err.timedOut).toBe(true);
    expect(err.message).toMatch(/timed out after 300 ms/);
  });

  test("errors leave out the query string, which can carry Duo's authkey", async () => {
    const err = await client(300)
      .get(`${base}/hang?authkey=SECRET&push_txid=abc`)
      .catch((e) => e);
    expect(err.message).not.toContain("SECRET");
    expect(err.url).toBe(`${base}/hang`);
  });
});

describe("CookieClient.clearHostCookies", () => {
  test("drops one host's cookies and keeps every other host's", async () => {
    const c = client();
    await c.jar.setCookie(
      "sessionid=s; Path=/",
      "https://stellic.princeton.edu/",
    );
    await c.jar.setCookie(
      "_shibsession_x=t; Path=/",
      "https://stellic.princeton.edu/",
    );
    await c.jar.setCookie(
      "TGC=cas; Path=/cas",
      "https://fed.princeton.edu/cas/",
    );
    await c.clearHostCookies("https://stellic.princeton.edu/");
    expect(await c.jar.getCookieString("https://stellic.princeton.edu/")).toBe(
      "",
    );
    expect(await c.jar.getCookieString("https://fed.princeton.edu/cas/")).toBe(
      "TGC=cas",
    );
  });
});
