import type { Cookies } from "@sveltejs/kit";
import type { StellicSession } from "./client";

/**
 * Where the Stellic session lives between login and export.
 *
 * THIS IS THE HANDOFF POINT WITH THE LOGIN WORK: whatever ends up producing a
 * Stellic session (cookie header + CSRF token) calls setStellicSession(), and
 * the export reads it with getStellicSession(). Nothing else needs to change.
 *
 * MVP storage: an httpOnly, Secure, SameSite=Strict cookie on Junction's domain,
 * expiring with Stellic's own one-hour session. Before shipping beyond the team,
 * encrypt it or keep it server-side: it is a working credential for the
 * student's Stellic account.
 */
const COOKIE = "stellic_session";
const ONE_HOUR = 60 * 60;

export function setStellicSession(cookies: Cookies, session: StellicSession) {
    cookies.set(
        COOKIE,
        Buffer.from(JSON.stringify(session)).toString("base64url"),
        {
            path: "/api/client/stellic",
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            maxAge: ONE_HOUR
        }
    );
}

export function getStellicSession(cookies: Cookies): StellicSession | null {
    const raw = cookies.get(COOKIE);
    if (!raw) return null;
    try {
        const s = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
        if (
            typeof s?.cookieHeader === "string" &&
            typeof s?.csrfToken === "string"
        ) {
            return { cookieHeader: s.cookieHeader, csrfToken: s.csrfToken };
        }
    } catch {
        /* fall through */
    }
    return null;
}

export function clearStellicSession(cookies: Cookies) {
    cookies.delete(COOKIE, { path: "/api/client/stellic" });
}
