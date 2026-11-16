import { json, type RequestHandler } from "@sveltejs/kit";
import { StellicError } from "$lib/server/stellic/client";
import {
    exportScheduleToStellic,
    type ConflictDecision,
    type JunctionCourse,
    type JunctionMeeting,
    type JunctionSection
} from "$lib/server/stellic/export";
import {
    clearStellicSession,
    getStellicSession
} from "$lib/server/stellic/session";

/**
 * POST /api/client/stellic/export
 * Body: {
 *   term: number,
 *   courses: { code, sections: { name, meetings: { days, start, end }[] }[] }[],
 *   decisions?: { "<Junction code>|<Stellic code>": "replace" | "skip" }
 * }
 * (The older { term, codes: string[] } still works: courses without sections.)
 *
 * 200 { needsDecision: true, conflicts }   nothing written yet: ask the student, resend with decisions
 * 200 { needsDecision: false, added, skipped, failed, prereqWarnings, replaced, keptExisting, sectionNotes }
 * 401 { needsLogin: true }   no Stellic session, or it expired: log in, then retry
 */
export const POST: RequestHandler = async ({ request, cookies, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!user)
        return json({ error: "Not signed in to Junction" }, { status: 401 });

    let body: {
        term?: unknown;
        codes?: unknown;
        courses?: unknown;
        decisions?: unknown;
    };
    try {
        body = await request.json();
    } catch {
        return json({ error: "Invalid request" }, { status: 400 });
    }
    const term = Number(body.term);
    const courses = parseCourses(body).slice(0, 20);
    const decisions = parseDecisions(body.decisions);
    if (!Number.isInteger(term) || courses.length === 0) {
        return json({ error: "Nothing to export" }, { status: 400 });
    }

    const session = getStellicSession(cookies);
    if (!session) return json({ needsLogin: true }, { status: 401 });

    try {
        return json(
            await exportScheduleToStellic(session, term, courses, decisions)
        );
    } catch (e) {
        if (e instanceof StellicError && e.kind === "auth") {
            clearStellicSession(cookies);
            return json({ needsLogin: true }, { status: 401 });
        }
        // Never include the session in logs or responses.
        console.error(
            "Stellic export failed:",
            e instanceof Error ? e.message : e
        );
        return json(
            { error: e instanceof StellicError ? e.message : "Export failed" },
            { status: 502 }
        );
    }
};

const DAYS = new Set([
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday"
]);

/** Validate the browser's course list; drop anything malformed. */
function parseCourses(body: {
    codes?: unknown;
    courses?: unknown;
}): JunctionCourse[] {
    if (Array.isArray(body.courses)) {
        const out: JunctionCourse[] = [];
        for (const c of body.courses as unknown[]) {
            const course = c as { code?: unknown; sections?: unknown };
            if (!course || typeof course.code !== "string") continue;
            const sections: JunctionSection[] = [];
            for (const raw of asArray(course.sections).slice(0, 10)) {
                const sec = raw as { name?: unknown; meetings?: unknown };
                if (!sec || typeof sec.name !== "string") continue;
                const meetings: JunctionMeeting[] = [];
                for (const rawM of asArray(sec.meetings).slice(0, 10)) {
                    const m = rawM as {
                        days?: unknown;
                        start?: unknown;
                        end?: unknown;
                    };
                    if (
                        !m ||
                        typeof m.start !== "number" ||
                        typeof m.end !== "number"
                    )
                        continue;
                    const days = asArray(m.days).filter(
                        (d): d is string => typeof d === "string" && DAYS.has(d)
                    );
                    meetings.push({ days, start: m.start, end: m.end });
                }
                sections.push({ name: sec.name.slice(0, 8), meetings });
            }
            out.push({ code: course.code, sections });
        }
        return out;
    }
    return asArray(body.codes)
        .filter((c): c is string => typeof c === "string")
        .map(code => ({ code, sections: [] }));
}

function asArray(v: unknown): unknown[] {
    return Array.isArray(v) ? v : [];
}

function parseDecisions(raw: unknown): Record<string, ConflictDecision> {
    const out: Record<string, ConflictDecision> = {};
    if (!raw || typeof raw !== "object") return out;
    for (const [k, v] of Object.entries(raw as Record<string, unknown>).slice(
        0,
        100
    )) {
        if (v === "replace" || v === "skip") out[k] = v;
    }
    return out;
}
