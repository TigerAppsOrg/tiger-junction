/**
 * Minimal server-side client for Stellic's internal planner API.
 *
 * Stellic has no public API. These calls mirror what the Stellic web app sends,
 * as documented in "Stellic Endpoint Notes" (captured Oct 2026):
 *   - every response starts with the line  )]}',  which must be stripped
 *   - request bodies are form-encoded
 *   - every call needs the session cookie, X-CSRFToken and X-Requested-With
 *
 * Lives under $lib/server so SvelteKit refuses to ship it (or a session) to the browser.
 * Never log a StellicSession: it is a live credential for the student's account.
 */

export const STELLIC_ORIGIN = "https://stellic.princeton.edu";
const XSSI_PREFIX = ")]}'";

/** What a successful login must hand the export: the browser-equivalent credentials. */
export type StellicSession = {
    /** The full Cookie header Stellic expects, e.g. "sessionid=...; csrftoken=...". */
    cookieHeader: string;
    /** The value to send as X-CSRFToken. */
    csrfToken: string;
};

export class StellicError extends Error {
    constructor(
        message: string,
        /** "auth" = session missing or expired: send the user to log in again. */
        public readonly kind: "auth" | "request" | "parse",
        public readonly status?: number
    ) {
        super(message);
        this.name = "StellicError";
    }
}

/** Parse a Stellic response body: drop the )]}', line, then JSON. */
export function parseStellicJson<T = unknown>(text: string): T {
    let body = text.trimStart();
    if (body.startsWith(XSSI_PREFIX)) {
        const newline = body.indexOf("\n");
        body = newline === -1 ? "" : body.slice(newline + 1);
    }
    try {
        return JSON.parse(body) as T;
    } catch {
        throw new StellicError(
            "Stellic returned a response that is not JSON",
            "parse"
        );
    }
}

async function post<T>(
    session: StellicSession,
    path: string,
    form: Record<string, string> = {}
): Promise<T> {
    const res = await fetch(STELLIC_ORIGIN + path, {
        method: "POST",
        redirect: "manual", // an expired session answers 302 to Princeton login
        headers: {
            "Cookie": session.cookieHeader,
            "X-CSRFToken": session.csrfToken,
            "X-Requested-With": "XMLHttpRequest",
            "Accept": "application/json, text/plain, */*",
            "Content-Type": "application/x-www-form-urlencoded",
            "Origin": STELLIC_ORIGIN,
            "Referer": STELLIC_ORIGIN + "/app/planner"
        },
        body: new URLSearchParams(form).toString()
    });

    // fetch with redirect: "manual" reports a redirect as status 3xx or 0 ("opaqueredirect").
    if (res.status === 0 || (res.status >= 300 && res.status < 400)) {
        throw new StellicError("Stellic session expired", "auth", res.status);
    }
    if (res.status === 401 || res.status === 403) {
        throw new StellicError(
            "Stellic rejected the session",
            "auth",
            res.status
        );
    }
    if (!res.ok) {
        throw new StellicError(`Stellic ${path} failed`, "request", res.status);
    }
    return parseStellicJson<T>(await res.text());
}

// ---------- endpoint types (only the fields the export uses) ----------

export type StellicPlanCourse = {
    code: string;
    plancourse_id: number;
    course_id: number;
    status: string; // "taken" | "planned"
};

export type StellicTerm = { courses: StellicPlanCourse[] };

export type StellicPlan = {
    plan_id: string;
    /** year index -> [start year, end year], e.g. { "2": [2026, 2027] } */
    academic_years: Record<string, [number, number]>;
    /** semester type (1 Fall, 2 Spring, 3 Summer) -> year index -> term */
    sem_content: { id: number; content: Record<string, StellicTerm> }[];
};

type GetPlanResponse = { success: boolean; student_plan: StellicPlan };
type AddCourseResponse = {
    success: boolean;
    courses_affected?: { id: number; code: string }[];
};

// ---------- endpoints ----------

/** POST /planner/getstudentplan/ : the student's primary plan, every term. */
export async function getStudentPlan(
    session: StellicSession
): Promise<StellicPlan> {
    const data = await post<GetPlanResponse>(
        session,
        "/planner/getstudentplan/"
    );
    if (!data.success || !data.student_plan?.plan_id) {
        throw new StellicError("Stellic did not return a plan", "request");
    }
    return data.student_plan;
}

/** POST /planner/add-course/ : returns the new plancourse_id. */
export async function addCourse(
    session: StellicSession,
    args: { planId: string; courseCode: string; semId: number; year: string }
): Promise<number | null> {
    const data = await post<AddCourseResponse>(
        session,
        "/planner/add-course/",
        {
            plan_id: args.planId,
            course_code: args.courseCode,
            sem_id: String(args.semId),
            year: args.year
        }
    );
    if (!data.success) {
        throw new StellicError(
            `Stellic did not add ${args.courseCode}`,
            "request"
        );
    }
    return data.courses_affected?.[0]?.id ?? null;
}

/** POST /auth/extendsession/ : renews a live session by an hour. */
export async function extendSession(session: StellicSession): Promise<void> {
    await post(session, "/auth/extendsession/");
}
