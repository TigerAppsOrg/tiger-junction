// The password-bearing half of the flow: sign in to CAS and drive Duo.
//
// It is two-phase so a push can be awaited out of band:
//   start()  -> submits netid+password to CAS, sends the Duo push
//   finish() -> after the user approves, completes Duo -> CAS -> SAML -> Stellic
//
// The password is passed to start() and used for that one CAS request; it is
// never kept on this object. Only the resulting StellicSession (cookies) is kept.

import {
  CookieClient,
  HttpError,
  debugLog,
  parseCasError,
  parseForm,
} from "./http.ts";
import {
  BROWSER_FEATURES,
  CAS_HOST,
  DUO_HOST_SUFFIX,
  STELLIC_URL,
  USER_AGENT,
  hostOf,
} from "./constants.ts";
import { StellicSession, sessionExpiry } from "./session.ts";
import {
  PushNotApprovedError,
  PushPendingError,
  StellicLoginError,
} from "./errors.ts";

export interface PushChallenge {
  /** Device the push was sent to, e.g. `"iOS" (•••-•••-1234)`; null if none needed. */
  device: string | null;
  /** Verification code to confirm in the Duo app, when Duo requires one. */
  verificationCode: string | null;
  /** False when Duo already trusts this device and no push is needed. */
  pushNeeded: boolean;
}

/** A completed login: the authenticated session and when it ends. */
export interface FinishedLogin {
  session: StellicSession;
  expiresAt: Date;
}

export class StellicLogin {
  private client: CookieClient;
  private duoBase = "";
  private authkey = "";
  private txid: string | null = null;
  private duoHeaders: Record<string, string> = {};
  private pushNeeded = true;
  /** Failed answers to Duo's trust prompt, reported if finalize_auth then fails. */
  private trustErrors: string[] = [];

  constructor(
    private netid: string,
    private opts: { timeoutMs: number },
  ) {
    this.client = new CookieClient({
      userAgent: USER_AGENT,
      timeoutMs: opts.timeoutMs,
    });
  }

  /** Submit netid/password to CAS and send the Duo push. */
  async start(password: string): Promise<PushChallenge> {
    const page = await this.client.get(STELLIC_URL);
    if (hostOf(page.url) !== CAS_HOST) {
      throw new StellicLoginError(`Expected CAS login page, got ${page.url}`);
    }

    const form = parseForm(page.text).inputs;
    form.username = this.netid;
    form.password = password;
    const afterLogin = await this.client.post(page.url, { form });
    if (!hostOf(afterLogin.url).endsWith(DUO_HOST_SUFFIX)) {
      throw new StellicLoginError(
        `CAS login failed: ${parseCasError(afterLogin.text) ?? afterLogin.url}`,
      );
    }

    // afterLogin.url: https://api-XXXX.duosecurity.com/prompt/<akey>?authkey=...&req_trace_group=...
    const url = new URL(afterLogin.url);
    this.duoBase = `${url.origin}${url.pathname}`;
    this.authkey = url.searchParams.get("authkey") ?? "";
    if (!this.authkey)
      throw new StellicLoginError("Duo prompt did not return an authkey");
    this.duoHeaders = {
      Referer: afterLogin.url,
      "X-Duo-Req-Trace-Group": url.searchParams.get("req_trace_group") ?? "",
    };

    await this.duo("GET", "/auth/payload", {
      browser_features: BROWSER_FEATURES,
    });
    const evaluation = await this.duo("GET", "/pre_authn/evaluation", {
      browser_features: BROWSER_FEATURES,
      local_trust_choice: "undecided",
    });

    if (evaluation.action !== "auth") {
      // Duo already trusts this device: no push; finish() goes straight to finalize.
      this.pushNeeded = false;
      return { device: null, verificationCode: null, pushNeeded: false };
    }

    const factors =
      evaluation.auth_factors_context?.available_unified_auth_factors
        ?.factors ?? [];
    const push = factors.find(
      (f: { factor_type: string }) => f.factor_type === "push",
    );
    if (!push)
      throw new StellicLoginError(
        "No Duo Push device registered on this account",
      );

    const sent = await this.duo("POST", "/auth/factors/push/auth", {
      pkey: push.device_info.pkey,
    });
    this.txid = sent.push_txid;
    return {
      device: push.device_info.name,
      verificationCode: sent.step_up_code ?? null,
      pushNeeded: true,
    };
  }

  /**
   * After the user approved the push, finish the redirects into an
   * authenticated session. Waits up to `pushWaitMs` for the approval, then
   * throws PushPendingError; finish() may then be called again.
   *
   * Returns the session with its end time, read from the SAML response and
   * Stellic's own session info, so the caller needs no further request.
   */
  async finish(pushWaitMs = this.opts.timeoutMs): Promise<FinishedLogin> {
    if (this.pushNeeded) await this.waitForPush(pushWaitMs);

    let exitUrl: string;
    try {
      ({ url: exitUrl } = await this.duo("GET", "/auth/finalize_auth"));
    } catch (err) {
      // Report trust-prompt failures too; they may explain this one.
      if (err instanceof StellicLoginError && this.trustErrors.length) {
        throw new StellicLoginError(
          `${err.message} (after ${this.trustErrors.join("; ")})`,
        );
      }
      throw err;
    }
    // Duo exit -> CAS -> SAML callback page with an auto-submit form to Stellic.
    const session = new StellicSession(this.client);
    const callback = await this.client.get(exitUrl);
    const samlDeadline = await session.postSamlResponse(callback);
    const info = await session.sessionInfo(); // throws if Stellic did not accept the login
    return { session, expiresAt: sessionExpiry(info, samlDeadline) };
  }

  private async waitForPush(waitMs: number): Promise<void> {
    if (!this.txid) throw new StellicLoginError("start() was not called");
    const deadline = Date.now() + waitMs;
    for (;;) {
      // Duo holds this request open until the push is answered (a long poll).
      // A browser never cuts it off, so neither do we: it may stay open for
      // the rest of the wait. Running out of time only means "no answer yet".
      let status;
      try {
        status = (
          await this.duo(
            "GET",
            "/auth/factors/push/status",
            { push_txid: this.txid, saw_good_news: "false" },
            Math.max(1000, deadline - Date.now()),
          )
        ).result;
      } catch (err) {
        if (!(err instanceof HttpError && err.timedOut)) throw err;
        debugLog("push status: request timed out, asking again");
        if (Date.now() >= deadline) throw new PushPendingError();
        continue;
      }
      // "SUCCESS" means the push is over, not that it was approved: Duo also
      // answers SUCCESS when an unanswered push expires. The verdict is in
      // auth_result.authn_evaluation.is_allowed.
      const evaluation = status?.auth_result?.authn_evaluation;
      debugLog(
        `push status: ${status?.result}, allowed: ${evaluation?.is_allowed}`,
      );
      if (status.result === "SUCCESS") {
        if (evaluation?.is_allowed === true) break;
        throw new PushNotApprovedError();
      }
      if (status.result !== "STATUS") {
        throw new StellicLoginError(
          `Duo Push failed: ${JSON.stringify(status)}`,
        );
      }
      if (Date.now() >= deadline) throw new PushPendingError();
      await sleep(1000);
    }

    // After an approved push the browser answers Duo's "Is this your device?"
    // prompt before finalizing, so we do the same. "No" is the right answer for
    // a server signing in on a student's behalf. A failure here does not stop
    // the login on its own; it is reported if finalize_auth then fails.
    for (const [path, payload] of [
      ["/auth/browser_trust", { is_trusted: false }],
      ["/auth/remember_me", {}],
    ] as const) {
      try {
        await this.duo("POST", path, payload);
      } catch (err) {
        if (!(err instanceof StellicLoginError || err instanceof HttpError)) {
          throw err;
        }
        this.trustErrors.push(`${path}: ${err.message}`);
      }
    }
  }

  /** Call the Duo prompt API and return its "response" object. */
  private async duo(
    method: string,
    path: string,
    // Strings for GET query params; POST bodies are JSON and may hold booleans.
    extra: Record<string, string | boolean> = {},
    timeoutMs?: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    const withKey = { authkey: this.authkey, ...extra };
    const res = await this.client.request(method, this.duoBase + path, {
      headers: this.duoHeaders,
      timeoutMs,
      ...(method === "GET"
        ? {
            params: Object.fromEntries(
              Object.entries(withKey).map(([k, v]) => [k, String(v)]),
            ),
          }
        : { json: withKey }),
    });
    let body: { stat?: string; message?: string; response?: unknown };
    try {
      body = JSON.parse(res.text);
    } catch {
      throw new StellicLoginError(
        `Duo ${path}: HTTP ${res.status} ${res.text.slice(0, 300)}`,
      );
    }
    if (body.stat !== "OK") {
      throw new StellicLoginError(
        `Duo ${path}: HTTP ${res.status} ${body.message ?? JSON.stringify(body)}`,
      );
    }
    return body.response;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
