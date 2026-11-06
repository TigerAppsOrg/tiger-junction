/**
 * Log in to Stellic through Princeton CAS + Duo Push, server-side.
 *
 * TypeScript port of Stanislav Zhelokhovtsev's StellicAuth
 * (github.com/ProBluebbes/StellicAuth, stellic_login.py), split in two so it
 * fits a web request cycle:
 *
 *   startLogin(netid, password)  CAS form -> Duo -> send push.
 *                                Returns the device name, Duo's verification
 *                                code (if any) and a serializable state.
 *   finishLogin(state)           Waits a little for the push to be approved.
 *                                "pending" -> call again with the new state.
 *                                "done"    -> Stellic cookies + CSRF token.
 *
 * The password is used once in startLogin and is never part of the state.
 * The state does hold live CAS/Duo cookies: store it encrypted and briefly
 * (see loginStore.ts), and never log it.
 */

import type { StellicSession } from "./client";

const STELLIC_URL = "https://stellic.princeton.edu/";
const CAS_HOST = "fed.princeton.edu";
const DUO_HOST_SUFFIX = "duosecurity.com";
const USER_AGENT =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36";
const BROWSER_FEATURES = JSON.stringify({
    touch_supported: false,
    platform_authenticator_status: "unavailable",
    webauthn_supported: false,
    screen_resolution_height: 0,
    screen_resolution_width: 0,
    screen_color_depth: 0
});
const TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 20;

export class StellicLoginError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "StellicLoginError";
    }
}

// ---------- a minimal cookie jar (what requests.Session does for the script) ----------

type JarCookie = {
    name: string;
    value: string;
    domain: string; // lower-case, no leading dot
    hostOnly: boolean;
    path: string;
    expires: number | null; // ms since epoch
};

function storeCookies(jar: JarCookie[], url: URL, setCookies: string[]) {
    for (const line of setCookies) {
        const [pair, ...attrs] = line.split(";");
        const eq = pair.indexOf("=");
        if (eq <= 0) continue;
        const cookie: JarCookie = {
            name: pair.slice(0, eq).trim(),
            value: pair.slice(eq + 1).trim(),
            domain: url.hostname.toLowerCase(),
            hostOnly: true,
            path: "/",
            expires: null
        };
        for (const attr of attrs) {
            const i = attr.indexOf("=");
            const key = (i === -1 ? attr : attr.slice(0, i))
                .trim()
                .toLowerCase();
            const val = i === -1 ? "" : attr.slice(i + 1).trim();
            if (key === "domain" && val) {
                const d = val.replace(/^\./, "").toLowerCase();
                // Ignore a Domain the response's host may not set.
                if (url.hostname === d || url.hostname.endsWith("." + d)) {
                    cookie.domain = d;
                    cookie.hostOnly = false;
                }
            } else if (key === "path" && val.startsWith("/")) {
                cookie.path = val;
            } else if (key === "max-age") {
                const s = Number(val);
                if (Number.isFinite(s)) cookie.expires = Date.now() + s * 1000;
            } else if (key === "expires" && cookie.expires === null) {
                const t = Date.parse(val);
                if (!Number.isNaN(t)) cookie.expires = t;
            }
        }
        const i = jar.findIndex(
            c =>
                c.name === cookie.name &&
                c.domain === cookie.domain &&
                c.path === cookie.path
        );
        if (i !== -1) jar.splice(i, 1);
        if (cookie.expires === null || cookie.expires > Date.now())
            jar.push(cookie);
    }
}

function cookieHeaderFor(jar: JarCookie[], url: URL): string {
    const host = url.hostname.toLowerCase();
    const now = Date.now();
    return jar
        .filter(
            c =>
                (c.expires === null || c.expires > now) &&
                (c.hostOnly
                    ? host === c.domain
                    : host === c.domain || host.endsWith("." + c.domain)) &&
                url.pathname.startsWith(c.path)
        )
        .map(c => `${c.name}=${c.value}`)
        .join("; ");
}

// ---------- HTTP with redirects + cookies ----------

type HttpResult = { status: number; url: string; text: string };

async function http(
    jar: JarCookie[],
    method: "GET" | "POST",
    url: string,
    opts: {
        form?: Record<string, string>;
        json?: unknown;
        headers?: Record<string, string>;
    } = {}
): Promise<HttpResult> {
    let current = new URL(url);
    let body: string | undefined;
    let contentType: string | undefined;
    if (opts.form) {
        body = new URLSearchParams(opts.form).toString();
        contentType = "application/x-www-form-urlencoded";
    } else if (opts.json !== undefined) {
        body = JSON.stringify(opts.json);
        contentType = "application/json";
    }

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        const headers: Record<string, string> = {
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/json;q=0.9,*/*;q=0.8",
            ...opts.headers
        };
        const cookie = cookieHeaderFor(jar, current);
        if (cookie) headers.Cookie = cookie;
        if (body !== undefined && contentType)
            headers["Content-Type"] = contentType;

        const res = await fetch(current, {
            method,
            headers,
            body,
            redirect: "manual",
            signal: AbortSignal.timeout(TIMEOUT_MS)
        });
        storeCookies(jar, current, res.headers.getSetCookie());

        const location = res.headers.get("location");
        if (res.status >= 300 && res.status < 400 && location) {
            current = new URL(location, current);
            // Like browsers and requests: 303, and POST on 301/302, become GET.
            if (
                res.status === 303 ||
                (res.status <= 302 && method === "POST")
            ) {
                method = "GET";
                body = undefined;
                contentType = undefined;
            }
            continue;
        }
        return {
            status: res.status,
            url: current.toString(),
            text: await res.text()
        };
    }
    throw new StellicLoginError("Too many redirects during login");
}

// ---------- HTML helpers (same approach as the Python script) ----------

function unescapeHtml(s: string): string {
    return s
        .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
            String.fromCodePoint(parseInt(h, 16))
        )
        .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");
}

function formInputs(page: string): Record<string, string> {
    const inputs: Record<string, string> = {};
    for (const tag of page.match(/<input\b[^>]*>/g) ?? []) {
        const name = tag.match(/name="([^"]*)"/);
        const value = tag.match(/value="([^"]*)"/);
        if (name)
            inputs[unescapeHtml(name[1])] = value ? unescapeHtml(value[1]) : "";
    }
    return inputs;
}

function casError(page: string): string | null {
    const m = page.match(/id="loginErrorsPanel"[^>]*>([\s\S]*?)<\/div>/);
    if (!m) return null;
    return unescapeHtml(m[1].replace(/<[^>]+>/g, " "))
        .split(/\s+/)
        .join(" ")
        .trim();
}

const hostOf = (url: string) => new URL(url).hostname;

// ---------- Duo prompt API ----------

export type LoginState = {
    jar: JarCookie[];
    duoBase: string;
    authkey: string;
    duoHeaders: Record<string, string>;
    txid: string;
};

async function duo(
    state: Omit<LoginState, "txid">,
    method: "GET" | "POST",
    path: string,
    data: Record<string, unknown> = {}
): Promise<Record<string, unknown>> {
    let url = state.duoBase + path;
    let res: HttpResult;
    if (method === "GET") {
        const qs = new URLSearchParams({
            authkey: state.authkey,
            ...(data as Record<string, string>)
        });
        url += "?" + qs.toString();
        res = await http(state.jar, "GET", url, { headers: state.duoHeaders });
    } else {
        res = await http(state.jar, "POST", url, {
            json: { authkey: state.authkey, ...data },
            headers: state.duoHeaders
        });
    }
    if (res.status < 200 || res.status >= 300) {
        throw new StellicLoginError(`Duo ${path}: HTTP ${res.status}`);
    }
    let body: {
        stat?: string;
        message?: string;
        response?: Record<string, unknown>;
    };
    try {
        body = JSON.parse(res.text);
    } catch {
        throw new StellicLoginError(`Duo ${path}: unexpected response`);
    }
    if (body.stat !== "OK") {
        throw new StellicLoginError(`Duo ${path}: ${body.message ?? "failed"}`);
    }
    return body.response ?? {};
}

// ---------- public API ----------

/** Step 1: NetID + password to CAS, then send a Duo Push. */
export async function startLogin(
    netid: string,
    password: string
): Promise<{ device: string; code: string | null; state: LoginState }> {
    const jar: JarCookie[] = [];

    let r = await http(jar, "GET", STELLIC_URL);
    if (hostOf(r.url) !== CAS_HOST) {
        throw new StellicLoginError(
            "Stellic did not send us to Princeton login"
        );
    }

    const form = { ...formInputs(r.text), username: netid, password };
    // CAS answers a bad password with 401 and re-renders the form.
    r = await http(jar, "POST", r.url, { form });
    if (!hostOf(r.url).endsWith(DUO_HOST_SUFFIX)) {
        throw new StellicLoginError(
            casError(r.text) ??
                "Princeton login failed. Check your NetID and password."
        );
    }

    // r.url is https://api-XXXX.duosecurity.com/prompt/<akey>?authkey=...&req_trace_group=...
    const duoUrl = new URL(r.url);
    const authkey = duoUrl.searchParams.get("authkey");
    if (!authkey) throw new StellicLoginError("Duo did not start a login");
    const base = {
        jar,
        duoBase: `${duoUrl.protocol}//${duoUrl.host}${duoUrl.pathname}`,
        authkey,
        duoHeaders: {
            "Referer": r.url,
            "X-Duo-Req-Trace-Group":
                duoUrl.searchParams.get("req_trace_group") ?? ""
        }
    };

    await duo(base, "GET", "/auth/payload", {
        browser_features: BROWSER_FEATURES
    });
    const evaluation = await duo(base, "GET", "/pre_authn/evaluation", {
        browser_features: BROWSER_FEATURES,
        local_trust_choice: "undecided"
    });
    type Factor = {
        factor_type: string;
        device_info: { pkey: string; name: string };
    };
    const factors = (
        evaluation as {
            auth_factors_context?: {
                available_unified_auth_factors?: { factors?: Factor[] };
            };
        }
    ).auth_factors_context?.available_unified_auth_factors?.factors;
    const push = factors?.find(f => f.factor_type === "push");
    if (!push) {
        throw new StellicLoginError(
            "No Duo Push device is registered on this account"
        );
    }

    const sent = await duo(base, "POST", "/auth/factors/push/auth", {
        pkey: push.device_info.pkey
    });
    const txid = sent.push_txid;
    if (typeof txid !== "string")
        throw new StellicLoginError("Duo did not send a push");

    return {
        device: push.device_info.name,
        code: typeof sent.step_up_code === "string" ? sent.step_up_code : null,
        state: { ...base, txid }
    };
}

/**
 * Step 2: wait up to `waitMs` for the push to be approved, then finish the
 * Duo -> CAS -> SAML redirects back to Stellic.
 */
export async function finishLogin(
    state: LoginState,
    waitMs = 20_000
): Promise<
    | { status: "pending"; state: LoginState }
    | { status: "done"; session: StellicSession }
> {
    const deadline = Date.now() + waitMs;
    for (;;) {
        const res = await duo(state, "GET", "/auth/factors/push/status", {
            push_txid: state.txid,
            saw_good_news: "false"
        });
        const result = (res.result as { result?: string } | undefined)?.result;
        if (result === "SUCCESS") break;
        if (result !== "STATUS") {
            throw new StellicLoginError("The Duo Push was denied or expired");
        }
        if (Date.now() > deadline) return { status: "pending", state };
        await new Promise(r => setTimeout(r, 1000));
    }

    // "Is this your device?" prompts: Duo may refuse them, and they are not needed.
    for (const [path, body] of [
        ["/auth/browser_trust", { is_trusted: false }],
        ["/auth/remember_me", {}]
    ] as const) {
        try {
            await duo(state, "POST", path, body);
        } catch {
            /* ignored, as in the original script */
        }
    }
    const exitUrl = (await duo(state, "GET", "/auth/finalize_auth")).url;
    if (typeof exitUrl !== "string")
        throw new StellicLoginError("Duo did not finish");

    // Duo exit -> CAS -> SAML callback page with an auto-submit form to Stellic.
    let r = await http(state.jar, "GET", exitUrl);
    const action = r.text.match(/<form[^>]*action="([^"]+)"/);
    const samlForm = formInputs(r.text);
    if (!action || !("SAMLResponse" in samlForm)) {
        throw new StellicLoginError(
            "Princeton login did not return to Stellic"
        );
    }
    r = await http(
        state.jar,
        "POST",
        new URL(unescapeHtml(action[1]), r.url).toString(),
        { form: samlForm }
    );

    const info = await http(
        state.jar,
        "GET",
        new URL("/auth/getsessioninfo/", STELLIC_URL).toString(),
        { headers: { "X-Requested-With": "XMLHttpRequest" } }
    );
    if (!/"success":\s*true/.test(info.text)) {
        throw new StellicLoginError(
            "Reached Stellic, but the session is not signed in"
        );
    }

    // Stellic's CSRF cookie is set by its app pages; load one if it is missing.
    const stellicCookies = () =>
        state.jar.filter(c => c.domain.includes("stellic"));
    if (!stellicCookies().some(c => c.name === "csrftoken")) {
        await http(
            state.jar,
            "GET",
            new URL("/app/home", STELLIC_URL).toString()
        );
    }
    const cookies = stellicCookies();
    const csrf = cookies.find(c => c.name === "csrftoken");
    if (!csrf)
        throw new StellicLoginError("Stellic did not issue a CSRF token");

    // Only Stellic's own cookies leave this function: never Princeton's or Duo's.
    return {
        status: "done",
        session: {
            cookieHeader: cookies.map(c => `${c.name}=${c.value}`).join("; "),
            csrfToken: csrf.value
        }
    };
}
