import {
    addCourse,
    getStudentPlan,
    StellicError,
    StellicRefusal,
    type StellicPlan,
    type StellicSession
} from "./client";

/** Stellic's refusal code for unmet prerequisites (seen 2026-11-02 on EGR 153). */
const PREREQ_REFUSAL = 494;

/**
 * Princeton term code -> Stellic term.
 *
 * Term codes are 1YYS: YY = last two digits of the academic year's END year,
 * S = 2 for Fall, 4 for Spring (1272 = Fall 2026, 1274 = Spring 2027).
 * Stellic names a term by semester type (1 Fall, 2 Spring) and a year index
 * from the plan's academic_years map ({"2": [2026, 2027]}).
 */
export function termToStellic(
    termCode: number,
    academicYears: StellicPlan["academic_years"]
): { semId: number; year: string } | null {
    const s = String(termCode);
    if (!/^1\d{2}[24]$/.test(s)) return null;

    const endYear = 2000 + Number(s.slice(1, 3));
    const semId = s[3] === "2" ? 1 : 2;

    const year = Object.keys(academicYears).find(
        key => academicYears[key]?.[1] === endYear
    );
    return year ? { semId, year } : null;
}

/**
 * Junction stores codes without a space ("COS217", "COS435/ECE433"); Stellic
 * wants "COS 217". Accepts either form and returns each listing as "DEP 123X".
 */
export function splitCodes(code: string): string[] {
    const out: string[] = [];
    for (const part of code.split("/")) {
        const m = part
            .trim()
            .toUpperCase()
            .match(/^([A-Z]{3})\s*(\d{3}[A-Z]?)$/);
        if (m) out.push(`${m[1]} ${m[2]}`);
    }
    return out;
}

export type ExportResult = {
    added: string[];
    skipped: { code: string; reason: string }[];
    failed: { code: string; reason: string }[];
    /** Added anyway although the student has not met the prerequisites. */
    prereqWarnings: { code: string; missing: string; message: string }[];
};

/**
 * "Pre-requisites not satisfied for course EGR 153: EGR 151 [UGRD]" -> "EGR 151".
 * Falls back to the whole message if Stellic words it differently.
 */
export function missingPrereqs(message: string): string {
    const m = message.match(/not satisfied for course [^:]+:\s*(.+)$/i);
    if (!m) return message;
    return m[1].replace(/\s*\[[A-Z]+\]/g, "").trim();
}

/**
 * Add a Junction schedule's courses to the student's Stellic plan for one term.
 * Courses already anywhere in the plan (any listing of a cross-listed course,
 * any term) are skipped, so clicking the button twice adds nothing twice.
 */
export async function exportScheduleToStellic(
    session: StellicSession,
    termCode: number,
    courseCodes: string[]
): Promise<ExportResult> {
    const result: ExportResult = {
        added: [],
        skipped: [],
        failed: [],
        prereqWarnings: []
    };

    const plan = await getStudentPlan(session);
    const target = termToStellic(termCode, plan.academic_years);
    if (!target) {
        throw new StellicError(
            `Term ${termCode} is not in your Stellic plan's years`,
            "request"
        );
    }

    const inPlan = new Set<string>();
    for (const sem of plan.sem_content) {
        for (const term of Object.values(sem.content)) {
            for (const c of term.courses) inPlan.add(c.code.toUpperCase());
        }
    }

    for (const raw of courseCodes) {
        const listings = splitCodes(raw);
        if (listings.length === 0) {
            result.failed.push({
                code: raw,
                reason: "unrecognised course code"
            });
            continue;
        }
        const label = listings[0];
        if (listings.some(c => inPlan.has(c))) {
            result.skipped.push({
                code: label,
                reason: "already in your plan"
            });
            continue;
        }

        // Try each cross-listing until Stellic accepts one.
        let added = false;
        let lastError = "";
        for (const code of listings) {
            const args = {
                planId: plan.plan_id,
                courseCode: code,
                semId: target.semId,
                year: target.year
            };
            try {
                await addCourse(session, args);
                added = true;
            } catch (e) {
                if (e instanceof StellicError && e.kind === "auth") throw e;
                lastError = e instanceof Error ? e.message : "unknown error";

                // Unmet prerequisites (code 494) are only a warning in Stellic:
                // its own UI asks "add anyway?" and resends with force=true.
                // A plan is not an enrollment, so do the same and tell the student.
                if (e instanceof StellicRefusal && e.code === PREREQ_REFUSAL) {
                    try {
                        await addCourse(session, { ...args, force: true });
                        added = true;
                        result.prereqWarnings.push({
                            code,
                            missing: missingPrereqs(e.message),
                            message: e.message
                        });
                    } catch (e2) {
                        if (e2 instanceof StellicError && e2.kind === "auth")
                            throw e2;
                        lastError =
                            e2 instanceof Error ? e2.message : "unknown error";
                    }
                    // The prerequisite applies to every listing; stop here.
                    if (!added) break;
                }
            }
            if (added) {
                result.added.push(code);
                inPlan.add(code);
                break;
            }
        }
        if (!added) result.failed.push({ code: label, reason: lastError });
    }

    return result;
}
