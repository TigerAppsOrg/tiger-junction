// An authenticated Stellic session: renews it through CAS and reads the
// student's data. Nothing here needs a password.
//
// How long a session lasts: Princeton's login server ends each Stellic session
// 1 h after it was issued (SessionNotOnOrAfter in the SAML response), and
// Stellic's "Extend Session" cannot move that. A new session comes only from a
// new round trip through CAS, which works without a password or Duo until CAS
// itself stops renewing, 12 h after the student's password sign-in.

import { CookieJar } from "tough-cookie";
import { CookieClient, parseForm, type Response } from "./http.ts";
import {
  SEMESTER_SUMMARY_WIDGETS,
  STELLIC_URL,
  USER_AGENT,
  stellicUrl,
} from "./constants.ts";
import { NeedsReconnectError, StellicLoginError } from "./errors.ts";

export interface Course {
  code: string | null;
  title: string | null;
  units: number | null;
}

export interface SessionInfo {
  /** Seconds of idle time left before Stellic's own timeout. */
  remainingSeconds: number;
}

/** The serialized cookie jar, safe to seal and store. Holds no password. */
export interface SerializedSession {
  jar: ReturnType<CookieJar["toJSON"]>;
}

export class StellicSession {
  constructor(private client: CookieClient) {}

  /** Rebuild a session from a previously serialized cookie jar. */
  static fromSerialized(
    data: SerializedSession,
    timeoutMs: number,
  ): StellicSession {
    const jar = CookieJar.fromJSON(data.jar as never);
    return new StellicSession(
      new CookieClient({ jar, userAgent: USER_AGENT, timeoutMs }),
    );
  }

  serialize(): SerializedSession {
    return { jar: this.client.jar.toJSON() };
  }

  /** Idle time left on the session; throws if it is not authenticated. */
  async sessionInfo(): Promise<SessionInfo> {
    const res = await this.client.get(stellicUrl("/auth/getsessioninfo/"), {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
    const body = parseStellicJson(res);
    const remainingSeconds = Number(body.session_remaining_time);
    if (!body.success || !Number.isFinite(remainingSeconds)) {
      throw new StellicLoginError("Stellic session is no longer authenticated");
    }
    return { remainingSeconds };
  }

  /** Current semester's enrolled courses — real proof the session can read data. */
  async currentCourses(): Promise<Course[]> {
    const res = await this.client.get(
      stellicUrl("/dashboard/getwidgetscontent/"),
      {
        params: { widgets: SEMESTER_SUMMARY_WIDGETS },
        headers: { "X-Requested-With": "XMLHttpRequest" },
      },
    );
    const widgets = parseStellicJson(res).widgets ?? [];
    const content = widgets.length ? (widgets[0].content ?? {}) : {};
    const courses = content.semester_summary?.courses ?? [];
    return courses.map((c: Record<string, unknown>) => ({
      code: (c.code as string) ?? null,
      title: (c.title as string) ?? null,
      units: typeof c.units === "number" ? c.units : null,
    }));
  }

  /**
   * Replace the Stellic session with a new one from CAS single sign-on, and
   * return when the new one ends.
   *
   * Stellic's cookies are dropped first, so Stellic always sends us through
   * CAS for a new SAML response, even while the old session still works. CAS
   * answers with an auto-submit form, no password or Duo, until it stops
   * renewing; then it wants a real login and this throws NeedsReconnectError.
   */
  async reauthenticate(): Promise<Date> {
    await this.client.clearHostCookies(STELLIC_URL);
    const res = await this.client.get(STELLIC_URL);
    const samlDeadline = await this.postSamlResponse(res);
    const info = await this.sessionInfo(); // throws if Stellic did not accept it
    return sessionExpiry(info, samlDeadline);
  }

  /**
   * Submit the CAS page's auto-submit SAMLResponse form back to Stellic.
   * Returns the session deadline the SAML response carries, if it has one.
   */
  async postSamlResponse(res: Response): Promise<Date | null> {
    const { action, inputs: form } = parseForm(res.text);
    if (!action || !("SAMLResponse" in form)) {
      throw new NeedsReconnectError(
        `No SAML response from CAS (at ${res.url}); a full login is needed`,
      );
    }
    // RelayState can point at any Stellic URL (some POST-only); callers verify.
    await this.client.post(new URL(action, res.url).toString(), { form });
    return samlSessionDeadline(form.SAMLResponse);
  }
}

/**
 * SessionNotOnOrAfter from a base64 SAMLResponse: the time Princeton's login
 * server says the Stellic session must end. Null if absent (for example, an
 * encrypted assertion). Reads only this timestamp, never the student's attributes.
 */
export function samlSessionDeadline(samlResponse: string): Date | null {
  const xml = Buffer.from(samlResponse, "base64").toString("utf8");
  const match = /\bSessionNotOnOrAfter="([^"]+)"/.exec(xml);
  const time = match ? Date.parse(match[1]) : NaN;
  return Number.isFinite(time) ? new Date(time) : null;
}

/**
 * When a session ends: Stellic's idle timeout, or the SAML deadline if that
 * comes first. The idle timeout alone is the fallback without a SAML deadline.
 */
export function sessionExpiry(
  info: SessionInfo,
  samlDeadline: Date | null,
  now = Date.now(),
): Date {
  const idle = now + info.remainingSeconds * 1000;
  return new Date(samlDeadline ? Math.min(idle, samlDeadline.getTime()) : idle);
}

/** Parse a Stellic JSON response, stripping its )]}', XSSI guard prefix. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseStellicJson(res: Response): any {
  const stripped = res.text.replace(/^\)\]\}',\s*/, "");
  try {
    return JSON.parse(stripped);
  } catch {
    const snippet = res.text.slice(0, 200).replace(/\s+/g, " ");
    const hops = res.history.length
      ? ` (after redirects ${res.history.join(" -> ")})`
      : "";
    throw new StellicLoginError(
      `Expected JSON from Stellic, got HTTP ${res.status}${hops} at ${res.url}: ${JSON.stringify(snippet)}`,
    );
  }
}
