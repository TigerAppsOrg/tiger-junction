import { json, type RequestHandler } from "@sveltejs/kit";
import { StellicError } from "$lib/server/stellic/client";
import { exportScheduleToStellic } from "$lib/server/stellic/export";
import {
    clearStellicSession,
    getStellicSession
} from "$lib/server/stellic/session";

/**
 * POST /api/client/stellic/export
 * Body: { term: number, codes: string[] }   (codes as Junction stores them,
 *        e.g. "COS 333" or "COS 333 / ECE 333")
 *
 * 200 { added, skipped, failed }
 * 401 { needsLogin: true }   no Stellic session, or it expired: log in, then retry
 */
export const POST: RequestHandler = async ({ request, cookies, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!user)
        return json({ error: "Not signed in to Junction" }, { status: 401 });

    let body: { term?: unknown; codes?: unknown };
    try {
        body = await request.json();
    } catch {
        return json({ error: "Invalid request" }, { status: 400 });
    }
    const term = Number(body.term);
    const codes = Array.isArray(body.codes)
        ? body.codes
              .filter((c): c is string => typeof c === "string")
              .slice(0, 20)
        : [];
    if (!Number.isInteger(term) || codes.length === 0) {
        return json({ error: "Nothing to export" }, { status: 400 });
    }

    const session = getStellicSession(cookies);
    if (!session) return json({ needsLogin: true }, { status: 401 });

    try {
        return json(await exportScheduleToStellic(session, term, codes));
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
