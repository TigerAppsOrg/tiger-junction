// A small cookie-aware HTTP client, the TypeScript counterpart to Python's
// requests.Session. The login flow leans on three behaviours requests gives for
// free that Bun's fetch does not: a persistent cookie jar shared across every
// request and redirect, automatic redirect following, and easy access to the
// final URL and the chain of redirect statuses.

import { CookieJar } from "tough-cookie";
import { JSDOM } from "jsdom";

const MAX_REDIRECTS = 20;

// STELLIC_DEBUG=1 logs every hop: method, URL without its query, status, and
// the names (never the values) of cookies sent, set and dropped. Read per call
// so a test or script can switch it on after import.
const debugEnabled = () => !!process.env.STELLIC_DEBUG;

/** Log a timestamped debug line when STELLIC_DEBUG is set. */
export function debugLog(message: string): void {
  if (debugEnabled()) {
    console.error(
      `[stellic ${new Date().toISOString().slice(11, 23)}] ${message}`,
    );
  }
}

function cookieNames(header: string): string[] {
  return header ? header.split(";").map((c) => c.split("=", 1)[0].trim()) : [];
}

export class HttpError extends Error {
  /** The request URL without its query string, which can carry Duo's authkey. */
  public url: string;

  constructor(
    public status: number,
    url: string,
    public body: string,
    /** True when the request was cut off by its timeout. */
    public timedOut = false,
  ) {
    const safeUrl = url.split("?", 1)[0];
    super(`HTTP ${status} for ${safeUrl}: ${body}`);
    this.name = "HttpError";
    this.url = safeUrl;
  }
}

export interface Response {
  /** Final URL after following redirects. */
  url: string;
  /** Final HTTP status. */
  status: number;
  text: string;
  /** Statuses of the redirect hops that preceded the final response. */
  history: number[];
}

export interface RequestOptions {
  headers?: Record<string, string>;
  /** Form-encoded body; sets Content-Type: application/x-www-form-urlencoded. */
  form?: Record<string, string>;
  /** JSON body; sets Content-Type: application/json. */
  json?: unknown;
  /** Query parameters appended to the URL. */
  params?: Record<string, string>;
  /** Per-hop timeout for this request, overriding the client's default. */
  timeoutMs?: number;
}

function isRedirect(status: number): boolean {
  return (
    status === 301 ||
    status === 302 ||
    status === 303 ||
    status === 307 ||
    status === 308
  );
}

export class CookieClient {
  readonly jar: CookieJar;
  private readonly userAgent: string;
  private readonly timeoutMs: number;

  constructor(opts: { jar?: CookieJar; userAgent: string; timeoutMs: number }) {
    this.jar = opts.jar ?? new CookieJar();
    this.userAgent = opts.userAgent;
    this.timeoutMs = opts.timeoutMs;
  }

  get(url: string, opts: RequestOptions = {}): Promise<Response> {
    return this.request("GET", url, opts);
  }

  post(url: string, opts: RequestOptions = {}): Promise<Response> {
    return this.request("POST", url, opts);
  }

  async request(
    method: string,
    url: string,
    opts: RequestOptions = {},
  ): Promise<Response> {
    let currentUrl = withParams(url, opts.params);
    let currentMethod = method;
    let body = encodeBody(opts);
    const history: number[] = [];
    const timeoutMs = opts.timeoutMs ?? this.timeoutMs;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      // One deadline per hop, covering the body read as well as the headers.
      const signal = AbortSignal.timeout(timeoutMs);
      const res = await this.fetchOnce(
        currentMethod,
        currentUrl,
        body,
        opts.headers,
        signal,
        timeoutMs,
      );
      const dropped = await this.storeCookies(res, currentUrl);
      if (debugEnabled()) {
        const sent = cookieNames(await this.jar.getCookieString(currentUrl));
        const set = (res.headers.getSetCookie?.() ?? []).map(
          (sc) => sc.split("=", 1)[0],
        );
        debugLog(
          `${currentMethod} ${currentUrl.split("?", 1)[0]} -> ${res.status}` +
            ` | jar: [${sent.join(", ")}] | set: [${set.join(", ")}]` +
            (dropped.length ? ` | DROPPED: ${dropped.join("; ")}` : ""),
        );
      }

      if (isRedirect(res.status)) {
        // Redirect bodies are never read; release the connection right away.
        await res.body?.cancel().catch(() => {});
        const location = res.headers.get("location");
        if (!location)
          throw new HttpError(
            res.status,
            currentUrl,
            "redirect without Location",
          );
        history.push(res.status);
        currentUrl = new URL(location, currentUrl).toString();
        // 303, and 301/302 after a POST, continue as a bodyless GET — matching
        // how browsers and requests follow these.
        if (
          res.status === 303 ||
          (currentMethod === "POST" &&
            (res.status === 301 || res.status === 302))
        ) {
          currentMethod = "GET";
          body = undefined;
        }
        continue;
      }

      let text: string;
      try {
        text = await res.text();
      } catch (err) {
        throw failure(currentUrl, signal, timeoutMs, err);
      }
      return { url: currentUrl, status: res.status, text, history };
    }
    throw new HttpError(0, currentUrl, `exceeded ${MAX_REDIRECTS} redirects`);
  }

  /** One request with no redirect following, retried once if the socket drops. */
  private async fetchOnce(
    method: string,
    url: string,
    body: Body | undefined,
    extraHeaders: Record<string, string> | undefined,
    signal: AbortSignal,
    timeoutMs: number,
  ): Promise<globalThis.Response> {
    let lastErr: unknown;
    // Stellic sits behind a load balancer that closes idle connections; a
    // pooled-but-dead socket surfaces as a network error. One retry on a fresh
    // connection covers it. Every request here is safe to resend.
    for (let attempt = 0; attempt < 2; attempt++) {
      const headers: Record<string, string> = {
        "User-Agent": this.userAgent,
        ...(body ? { "Content-Type": body.contentType } : {}),
        ...extraHeaders,
      };
      const cookie = await this.jar.getCookieString(url);
      if (cookie) headers["Cookie"] = cookie;

      try {
        return await fetch(url, {
          method,
          headers,
          body: body?.data,
          redirect: "manual",
          signal,
        });
      } catch (err) {
        lastErr = err;
        if (signal.aborted) break;
      }
    }
    throw failure(url, signal, timeoutMs, lastErr);
  }

  /** Store the response's cookies; returns any the jar refused, with why. */
  private async storeCookies(
    res: globalThis.Response,
    url: string,
  ): Promise<string[]> {
    const dropped: string[] = [];
    for (const sc of res.headers.getSetCookie?.() ?? []) {
      try {
        await this.jar.setCookie(sc, url);
      } catch (err) {
        dropped.push(`${sc.split("=", 1)[0]} (${(err as Error).message})`);
      }
    }
    return dropped;
  }

  /** Drop every cookie set for this URL's exact host; other hosts keep theirs. */
  async clearHostCookies(url: string): Promise<void> {
    await this.jar.store.removeCookies(new URL(url).hostname, null);
  }
}

function failure(
  url: string,
  signal: AbortSignal,
  timeoutMs: number,
  err: unknown,
): HttpError {
  return signal.aborted
    ? new HttpError(0, url, `timed out after ${timeoutMs} ms`, true)
    : new HttpError(0, url, `network error: ${String(err)}`);
}

interface Body {
  data: string;
  contentType: string;
}

function encodeBody(opts: RequestOptions): Body | undefined {
  if (opts.form) {
    return {
      data: new URLSearchParams(opts.form).toString(),
      contentType: "application/x-www-form-urlencoded",
    };
  }
  if (opts.json !== undefined) {
    return { data: JSON.stringify(opts.json), contentType: "application/json" };
  }
  return undefined;
}

function withParams(url: string, params?: Record<string, string>): string {
  if (!params) return url;
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}

/**
 * Parse an HTML page into a queryable fragment. A fragment is several times
 * cheaper than a full JSDOM window and needs no cleanup. It treats <noscript>
 * contents as raw text, so those tags are unwrapped first to keep any inputs
 * inside them, as a full (script-less) document parse would.
 */
function parseHtml(html: string): DocumentFragment {
  return JSDOM.fragment(html.replace(/<\/?noscript\b[^>]*>/gi, ""));
}

/**
 * The first <form action="..."> in an HTML page (null if none), plus a map of
 * name -> value for every <input name="..."> on the page.
 */
export function parseForm(html: string): {
  action: string | null;
  inputs: Record<string, string>;
} {
  const doc = parseHtml(html);
  const inputs: Record<string, string> = {};
  for (const el of doc.querySelectorAll("input[name]")) {
    inputs[el.getAttribute("name")!] = el.getAttribute("value") ?? "";
  }
  const action =
    doc.querySelector("form[action]")?.getAttribute("action") ?? null;
  return { action, inputs };
}

/** First login-error message CAS renders, used to explain a failed sign-in. */
export function parseCasError(html: string): string | null {
  const panel = parseHtml(html).querySelector("#loginErrorsPanel");
  const text = panel?.textContent?.replace(/\s+/g, " ").trim();
  return text ? text : null;
}
