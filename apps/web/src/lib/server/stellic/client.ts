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
    return request<T>(
        session,
        "POST",
        path,
        new URLSearchParams(form).toString()
    );
}

/**
 * Some Stellic endpoints (changecoursesection) take a JSON body while still
 * declaring it form-encoded. Send it exactly the way the Stellic app does.
 */
async function postJsonBody<T>(
    session: StellicSession,
    path: string,
    body: unknown
): Promise<T> {
    return request<T>(session, "POST", path, JSON.stringify(body));
}

async function get<T>(
    session: StellicSession,
    path: string,
    query: Record<string, string>
): Promise<T> {
    return request<T>(
        session,
        "GET",
        path + "?" + new URLSearchParams(query).toString()
    );
}

async function request<T>(
    session: StellicSession,
    method: "GET" | "POST",
    path: string,
    body?: string
): Promise<T> {
    const headers: Record<string, string> = {
        "Cookie": session.cookieHeader,
        "X-CSRFToken": session.csrfToken,
        "X-Requested-With": "XMLHttpRequest",
        "Accept": "application/json, text/plain, */*",
        "Referer": STELLIC_ORIGIN + "/app/planner"
    };
    if (method === "POST") {
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        headers["Origin"] = STELLIC_ORIGIN;
    }
    const res = await fetch(STELLIC_ORIGIN + path, {
        method,
        redirect: "manual", // an expired session answers 302 to Princeton login
        headers,
        body
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
        throw new StellicError(
            `Stellic ${path.split("?")[0]} failed`,
            "request",
            res.status
        );
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
/**
 * On a refusal Stellic answers 200 with success: false and a reason, e.g.
 * { code: 494, text: "Pre-requisites not satisfied for course EGR 153: EGR 151 [UGRD]" }.
 * The Stellic UI then asks the student and resends with force=true.
 */
type AddCourseResponse = {
    success: boolean;
    courses_affected?: { id: number; code: string }[];
    message?: { code?: number; text?: string } | string;
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

/** A refusal Stellic would let the student override (prerequisites, etc.). */
export class StellicRefusal extends StellicError {
    constructor(
        message: string,
        public readonly code: number | null
    ) {
        super(message, "request");
        this.name = "StellicRefusal";
    }
}

/**
 * POST /planner/add-course/ : returns the new plancourse_id.
 * `force` mirrors the Stellic UI's "add anyway" (force=true&force_integrated=true);
 * only pass it after the student has confirmed.
 */
export async function addCourse(
    session: StellicSession,
    args: {
        planId: string;
        courseCode: string;
        semId: number;
        year: string;
        force?: boolean;
    }
): Promise<number | null> {
    const form: Record<string, string> = {
        plan_id: args.planId,
        course_code: args.courseCode,
        sem_id: String(args.semId),
        year: args.year
    };
    if (args.force) {
        form.force = "true";
        form.force_integrated = "true";
    }

    const data = await post<AddCourseResponse>(
        session,
        "/planner/add-course/",
        form
    );
    if (!data.success) {
        const msg = data.message;
        const text = typeof msg === "string" ? msg : msg?.text;
        const code = typeof msg === "object" && msg ? (msg.code ?? null) : null;
        throw new StellicRefusal(
            text || `Stellic did not add ${args.courseCode}`,
            code
        );
    }
    return data.courses_affected?.[0]?.id ?? null;
}

/** POST /auth/extendsession/ : renews a live session by an hour. */
export async function extendSession(session: StellicSession): Promise<void> {
    await post(session, "/auth/extendsession/");
}

/** POST /planner/remove-course/ : drops one course entry from a plan term. */
export async function removeCourse(
    session: StellicSession,
    args: {
        planId: string;
        courseCode: string;
        planCourseId: number;
        semId: number;
        year: string;
    }
): Promise<void> {
    const data = await post<{ success: boolean }>(
        session,
        "/planner/remove-course/",
        {
            plan_id: args.planId,
            course_code: args.courseCode,
            plancourse_id: String(args.planCourseId),
            sem_id: String(args.semId),
            year: args.year
        }
    );
    if (!data.success) {
        throw new StellicError(
            `Stellic did not remove ${args.courseCode}`,
            "request"
        );
    }
}

// ---------- sections (captured 2026-11-16, ORF 245 + COS 435 on Spring 2027) ----------

/** One meeting pattern: "02:55PM"-style times and lowercase weekday names. */
export type StellicTiming = {
    time: { start: string; end: string };
    days: string[];
};

export type StellicSection = {
    id: number;
    /** "L01", "P03", ... (same naming as the registrar and Junction) */
    name: string;
    type: { name: string; short_name: string };
    timings: StellicTiming[];
    /** For a precept: the lecture(s) it belongs to. */
    parents: { id: number }[];
};

export type StellicSectionGroup = {
    group_name: string; // "Lecture"
    group_short_name: string; // "LEC"
    required: boolean;
    sections: StellicSection[];
};

/** A course in one plan term, with the sections currently chosen for it. */
export type StellicTermCourse = {
    course: { id: number; code: string; is_registered: boolean };
    section_groups: StellicSectionGroup[];
};

/**
 * GET /scheduler/getsemestersections/ : every course in one plan term with
 * its chosen sections and their meeting times.
 */
export async function getSemesterSections(
    session: StellicSession,
    args: { planId: string; semId: number; year: string }
): Promise<StellicTermCourse[]> {
    const data = await get<{
        success: boolean;
        data_list?: StellicTermCourse[];
    }>(session, "/scheduler/getsemestersections/", {
        sem_id: String(args.semId),
        year: args.year,
        plan_id: args.planId
    });
    if (!data.success) {
        throw new StellicError(
            "Stellic did not return the term's sections",
            "request"
        );
    }
    return data.data_list ?? [];
}

/** GET /planner/getsections/ : all sections offered for a planned course. */
export async function getCourseSections(
    session: StellicSession,
    args: {
        planId: string;
        courseCode: string;
        semId: number;
        year: string;
        physicalYear: number;
        planCourseId: number;
    }
): Promise<StellicSectionGroup[]> {
    const data = await get<{
        success: boolean;
        data_list?: StellicSectionGroup[];
    }>(session, "/planner/getsections/", {
        plan_id: args.planId,
        course_code: args.courseCode,
        sem_id: String(args.semId),
        year: args.year,
        physical_year: String(args.physicalYear),
        campus_id: "10", // Main Princeton Location
        plan_course_id: String(args.planCourseId)
    });
    if (!data.success) {
        throw new StellicError(
            `Stellic did not list sections for ${args.courseCode}`,
            "request"
        );
    }
    return data.data_list ?? [];
}

/**
 * POST /planner/changecoursesection/ : sets the sections of a planned course.
 * Returns the sections Stellic actually stored (it may add a default precept).
 */
export async function changeCourseSections(
    session: StellicSession,
    args: {
        planId: string;
        courseCode: string;
        planCourseId: number;
        semId: number;
        year: string;
        sectionIds: number[];
    }
): Promise<StellicSection[]> {
    const data = await postJsonBody<{
        success: boolean;
        sections?: StellicSection[];
    }>(session, "/planner/changecoursesection/", {
        plan_id: args.planId,
        sem_id: String(args.semId),
        year: args.year,
        section_ids: args.sectionIds,
        course_code: args.courseCode,
        id: args.planCourseId
    });
    if (!data.success) {
        throw new StellicError(
            `Stellic did not set sections for ${args.courseCode}`,
            "request"
        );
    }
    return data.sections ?? [];
}
