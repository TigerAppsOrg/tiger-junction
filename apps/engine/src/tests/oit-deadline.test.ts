import { test, expect, afterEach } from "bun:test";
import { setTimeout as delay } from "node:timers/promises";
import OIT, { OIT_REQUEST_TIMEOUT_MS } from "../oit/index.js";
import { McpServer, WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/server";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { registerPublishedCourseTools } from "../mcp/tools/published-courses.js";

const originalFetch = globalThis.fetch;
const keys = ["CONSUMER_KEY", "CONSUMER_SECRET", "API_ACCESS_TOKEN"] as const;
const previous = Object.fromEntries(keys.map(k => [k, process.env[k]]));
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of keys) {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key];
  }
});
function credentials() {
  process.env.CONSUMER_KEY = "test-only-key";
  process.env.CONSUMER_SECRET = "test-only-secret";
  delete process.env.API_ACCESS_TOKEN;
}
function intercept(fn: (url: string, signal: AbortSignal) => Promise<Response>) {
  globalThis.fetch = (async (url, init) => {
    expect(init?.signal).toBeTruthy();
    return fn(String(url), init!.signal!);
  }) as typeof fetch;
}
const pending = async (signal: AbortSignal): Promise<Response> => {
  await delay(5_000, undefined, { signal });
  throw new Error("deadline did not cancel the source");
};

test("cold mint and API fetch share one budget instead of two per-phase timeouts", async () => {
  credentials();
  expect(OIT_REQUEST_TIMEOUT_MS).toBeLessThan(10_000);
  const signals: AbortSignal[] = [];
  intercept(async (url, signal) => {
    signals.push(signal);
    if (url.endsWith("/token")) {
      await delay(30, undefined, { signal });
      return Response.json({ access_token: "test-token" });
    }
    return pending(signal);
  });
  const started = performance.now();
  await expect(new OIT(100).getPublishedTerms()).rejects.toThrow();
  expect(signals.length).toBe(2);
  expect(signals[0]).toBe(signals[1]);
  expect(signals[0].aborted).toBe(true);
  expect(performance.now() - started).toBeLessThan(800);
});

test("401 refresh cannot restart the deadline, and another operation gets its own signal", async () => {
  credentials();
  const signals: AbortSignal[] = [];
  let mints = 0;
  let requests = 0;
  intercept(async (url, signal) => {
    signals.push(signal);
    if (url.endsWith("/token")) {
      mints++;
      if (mints === 2) return pending(signal);
      return Response.json({ access_token: "test-token" });
    }
    if (++requests === 1) return new Response("expired", { status: 401 });
    return Response.json({ term: [{ code: "1274" }] });
  });
  const oit = new OIT(100);
  await expect(oit.getPublishedTerms()).rejects.toThrow();
  expect(signals.length).toBe(3);
  expect(signals.every(s => s === signals[0])).toBe(true);
  expect((await oit.getPublishedTerms())[0].code).toBe("1274");
  expect(signals[3]).not.toBe(signals[0]);
});

test("500 retry backoff is cancelled and never starts an extra request after expiry", async () => {
  credentials();
  let requests = 0;
  intercept(async (url, signal) => url.endsWith("/token") ? Response.json({ access_token: "test-token" }) : (requests++, new Response("degraded", { status: 503 })));
  const started = performance.now();
  await expect(new OIT(100).getPublishedTerms()).rejects.toThrow();
  expect(requests).toBe(1);
  expect(performance.now() - started).toBeLessThan(800);
});

test("stalled API response body expires within the same budget", async () => {
  credentials();
  intercept(async (url, signal) => {
    if (url.endsWith("/token")) return Response.json({ access_token: "test-token" });
    return new Response(new ReadableStream({ start(controller) {
      controller.enqueue(new TextEncoder().encode('{"term":'));
      signal.addEventListener("abort", () => controller.error(signal.reason), { once: true });
    } }));
  });
  await expect(new OIT(100).getPublishedTerms()).rejects.toThrow();
});

test("MCP returns structured unavailable before the caller deadline when token mint stalls", async () => {
  credentials();
  intercept(async (_url, signal) => pending(signal));
  const server = new McpServer({ name: "deadline-test", version: "1" });
  registerPublishedCourseTools(server, () => new OIT(100));
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  const client = new Client({ name: "deadline-test", version: "1" });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL("https://test/mcp"), { fetch: (url, init) => transport.handleRequest(new Request(url, init)) }));
    const result = await client.callTool({ name: "list_published_terms", arguments: {} }, { timeout: 1000 });
    expect(result.isError).toBe(true);
    expect(JSON.parse((result.content as any)[0].text).coverage).toBe("unavailable");
    expect(JSON.stringify(result)).not.toContain("test-only-secret");
  } finally { await client.close(); await server.close(); }
});

test("simultaneous operations keep independent deadlines when one expires", async () => {
  credentials();
  delete process.env.CONSUMER_KEY;
  delete process.env.CONSUMER_SECRET;
  process.env.API_ACCESS_TOKEN = "test-static-token";
  let slowSignal: AbortSignal;
  intercept(async (url, signal) => {
    if (url.includes("/terms?")) { slowSignal = signal; return pending(signal); }
    expect(signal).not.toBe(slowSignal);
    await delay(80, undefined, { signal });
    expect(slowSignal.aborted).toBe(true);
    return Response.json({ course_details: { course_detail: { course_id: "002053", term: "1274" } } });
  });
  const oit = new OIT(100);
  const slow = oit.getPublishedTerms().then(() => "unexpected success", () => "expired");
  await delay(40);
  const detail = await oit.getCourseDetails("1274", "002053");
  expect(detail.course_id).toBe("002053");
  expect(await slow).toBe("expired");
});

test("stalled token response body expires before any course request starts", async () => {
  credentials();
  let requests = 0;
  intercept(async (url, signal) => {
    requests++;
    expect(url.endsWith("/token")).toBe(true);
    return new Response(new ReadableStream({ start(controller) {
      controller.enqueue(new TextEncoder().encode('{"access_token":"'));
      signal.addEventListener("abort", () => controller.error(signal.reason), { once: true });
    } }));
  });
  await expect(new OIT(100).getPublishedTerms()).rejects.toThrow();
  expect(requests).toBe(1);
});
