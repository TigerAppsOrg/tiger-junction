import {
    addCourse,
    changeCourseSections,
    getCourseSections,
    getSemesterSections,
    getStudentPlan,
    removeCourse,
    StellicError,
    StellicRefusal,
    type StellicPlan,
    type StellicSection,
    type StellicSession,
    type StellicTermCourse
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

// ---------- what the browser sends ----------

/** One meeting of a section: weekday names as Stellic writes them, minutes after midnight. */
export type JunctionMeeting = { days: string[]; start: number; end: number };
/** A section the student picked in Junction, e.g. { name: "L01", meetings: [...] }. */
export type JunctionSection = { name: string; meetings: JunctionMeeting[] };
export type JunctionCourse = { code: string; sections: JunctionSection[] };

/** "replace" = drop the existing Stellic course; "skip" = leave this Junction course out. */
export type ConflictDecision = "replace" | "skip";

export type StellicConflict = {
    /** Key for the student's answer: "<Junction code>|<existing code>". */
    id: string;
    junctionCode: string;
    existingCode: string;
    /** e.g. "Mon/Wed 2:55–4:15 PM" */
    when: string;
};

export type ExportResult = {
    added: string[];
    skipped: { code: string; reason: string }[];
    failed: { code: string; reason: string }[];
    /** Added anyway although the student has not met the prerequisites. */
    prereqWarnings: { code: string; missing: string; message: string }[];
    /** Existing Stellic courses removed because the student chose the Junction schedule. */
    replaced: { code: string; by: string }[];
    /** Junction courses left out because the student kept the existing Stellic course. */
    keptExisting: { code: string; conflictsWith: string }[];
    /** Section problems worth telling the student about. */
    sectionNotes: { code: string; message: string }[];
};

export type ExportOutcome =
    | ({ needsDecision: false } & ExportResult)
    | { needsDecision: true; conflicts: StellicConflict[] };

/**
 * "Pre-requisites not satisfied for course EGR 153: EGR 151 [UGRD]" -> "EGR 151".
 * Falls back to the whole message if Stellic words it differently.
 */
export function missingPrereqs(message: string): string {
    const m = message.match(/not satisfied for course [^:]+:\s*(.+)$/i);
    if (!m) return message;
    return m[1].replace(/\s*\[[A-Z]+\]/g, "").trim();
}

// ---------- times ----------

const DAY_ORDER = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday"
];
const DAY_LABEL: Record<string, string> = {
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
    sunday: "Sun"
};

/** "02:55PM" or "02:55 PM" -> minutes after midnight (null if unreadable). */
export function stellicTimeToMinutes(t: string): number | null {
    const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*([AP])M$/i);
    if (!m) return null;
    let h = Number(m[1]) % 12;
    if (m[3].toUpperCase() === "P") h += 12;
    return h * 60 + Number(m[2]);
}

function clock(min: number): string {
    const h = Math.floor(min / 60);
    const mm = String(min % 60).padStart(2, "0");
    return `${((h + 11) % 12) + 1}:${mm}`;
}

/** [Mon, Wed], 895, 975 -> "Mon/Wed 2:55–4:15 PM" */
export function describeMeeting(
    days: string[],
    start: number,
    end: number
): string {
    const d = [...new Set(days.map(x => x.toLowerCase()))]
        .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
        .map(x => DAY_LABEL[x] ?? x)
        .join("/");
    const ampm = (m: number) => (m >= 720 ? "PM" : "AM");
    const range =
        ampm(start) === ampm(end)
            ? `${clock(start)}–${clock(end)} ${ampm(end)}`
            : `${clock(start)} ${ampm(start)}–${clock(end)} ${ampm(end)}`;
    return `${d} ${range}`;
}

/** Meetings of the sections already chosen for a course in Stellic. */
function stellicMeetings(course: StellicTermCourse): JunctionMeeting[] {
    const out: JunctionMeeting[] = [];
    for (const g of course.section_groups ?? []) {
        for (const sec of g.sections ?? []) {
            for (const t of sec.timings ?? []) {
                const start = stellicTimeToMinutes(t.time?.start ?? "");
                const end = stellicTimeToMinutes(t.time?.end ?? "");
                if (start === null || end === null) continue;
                out.push({
                    days: (t.days ?? []).map(d => d.toLowerCase()),
                    start,
                    end
                });
            }
        }
    }
    return out;
}

/** First overlap between two sets of meetings, described for the popup. */
export function firstOverlap(
    a: JunctionMeeting[],
    b: JunctionMeeting[]
): string | null {
    for (const x of a) {
        for (const y of b) {
            const shared = x.days.filter(d => y.days.includes(d));
            if (shared.length && x.start < y.end && y.start < x.end) {
                return describeMeeting(shared, x.start, x.end);
            }
        }
    }
    return null;
}

// ---------- the export ----------

/**
 * Add a Junction schedule (courses and their chosen sections) to the
 * student's Stellic plan for one term.
 *
 * Two passes. Without `decisions` for every conflict, nothing is written:
 * the conflicts are returned for the student to answer. With answers, each
 * "replace" removes the existing Stellic course, each "skip" leaves that
 * Junction course (and all its sections) out, and everything else is added.
 *
 * Courses already in another term of the plan are skipped. A course already
 * in this term keeps its plan entry and gets the Junction sections.
 */
export async function exportScheduleToStellic(
    session: StellicSession,
    termCode: number,
    courses: JunctionCourse[],
    decisions: Record<string, ConflictDecision> = {}
): Promise<ExportOutcome> {
    const result: ExportResult = {
        added: [],
        skipped: [],
        failed: [],
        prereqWarnings: [],
        replaced: [],
        keptExisting: [],
        sectionNotes: []
    };

    const plan = await getStudentPlan(session);
    const target = termToStellic(termCode, plan.academic_years);
    if (!target) {
        throw new StellicError(
            `Term ${termCode} is not in your Stellic plan's years`,
            "request"
        );
    }
    const years = plan.academic_years[target.year];
    const physicalYear = target.semId === 1 ? years[0] : years[1];
    const termArgs = {
        planId: plan.plan_id,
        semId: target.semId,
        year: target.year
    };

    // Codes anywhere in the plan, and the courses (with sections) in this term.
    const inPlan = new Set<string>();
    for (const sem of plan.sem_content) {
        for (const term of Object.values(sem.content)) {
            for (const c of term.courses) inPlan.add(c.code.toUpperCase());
        }
    }
    const termCourses = await getSemesterSections(session, termArgs);
    const termByCode = new Map(
        termCourses.map(c => [c.course.code.toUpperCase(), c])
    );

    type Item = {
        label: string;
        listings: string[];
        sections: JunctionSection[];
        meetings: JunctionMeeting[];
        existing?: StellicTermCourse; // already in this term
    };
    const items: Item[] = [];
    for (const raw of courses) {
        const listings = splitCodes(raw.code);
        if (listings.length === 0) {
            result.failed.push({
                code: raw.code,
                reason: "unrecognised course code"
            });
            continue;
        }
        const existing = listings.map(c => termByCode.get(c)).find(Boolean);
        if (!existing && listings.some(c => inPlan.has(c))) {
            result.skipped.push({
                code: listings[0],
                reason: "already in another term of your plan"
            });
            continue;
        }
        const sections = (raw.sections ?? []).filter(
            s => s && typeof s.name === "string"
        );
        items.push({
            label: existing ? existing.course.code : listings[0],
            listings,
            sections,
            meetings: sections.flatMap(s => s.meetings ?? []),
            existing
        });
    }

    // Stellic courses this Junction schedule does not include.
    const ours = new Set(items.flatMap(i => i.listings));
    const others = termCourses.filter(
        c => !ours.has(c.course.code.toUpperCase())
    );

    const conflicts: (StellicConflict & { other: StellicTermCourse })[] = [];
    for (const item of items) {
        for (const other of others) {
            const when = firstOverlap(item.meetings, stellicMeetings(other));
            if (!when) continue;
            conflicts.push({
                id: `${item.label}|${other.course.code}`,
                junctionCode: item.label,
                existingCode: other.course.code,
                when,
                other
            });
        }
    }

    const unanswered = conflicts.filter(c => !decisions[c.id]);
    if (unanswered.length) {
        return {
            needsDecision: true,
            conflicts: conflicts.map(c => ({
                id: c.id,
                junctionCode: c.junctionCode,
                existingCode: c.existingCode,
                when: c.when
            }))
        };
    }

    // A Junction course is left out if the student kept any course it clashes with.
    const keep = new Set<string>();
    for (const c of conflicts) {
        if (decisions[c.id] === "skip") {
            keep.add(c.junctionCode);
            result.keptExisting.push({
                code: c.junctionCode,
                conflictsWith: c.existingCode
            });
        }
    }

    // Remove the Stellic courses the student chose to replace (once each).
    const removed = new Set<number>();
    for (const c of conflicts) {
        if (decisions[c.id] !== "replace" || keep.has(c.junctionCode)) continue;
        const pcId = c.other.course.id;
        if (removed.has(pcId)) continue;
        if (c.other.course.is_registered) {
            result.sectionNotes.push({
                code: c.existingCode,
                message:
                    "You are registered for this course, so it was left in your plan. Change it in TigerHub."
            });
            removed.add(pcId);
            continue;
        }
        try {
            await removeCourse(session, {
                ...termArgs,
                courseCode: c.existingCode,
                planCourseId: pcId
            });
            removed.add(pcId);
            result.replaced.push({ code: c.existingCode, by: c.junctionCode });
        } catch (e) {
            if (e instanceof StellicError && e.kind === "auth") throw e;
            result.sectionNotes.push({
                code: c.existingCode,
                message: `Could not be removed, so it is still in your plan alongside ${c.junctionCode}.`
            });
        }
    }

    for (const item of items) {
        if (keep.has(item.label)) continue;

        let planCourseId: number | null = item.existing?.course.id ?? null;
        let code = item.label;

        if (item.existing) {
            result.skipped.push({ code, reason: "already in your plan" });
        } else {
            const added = await addOneCourse(
                session,
                termArgs,
                item.listings,
                result
            );
            if (!added) continue;
            ({ code, planCourseId } = added);
        }

        if (item.sections.length && planCourseId !== null) {
            await setSections(
                session,
                { ...termArgs, physicalYear },
                code,
                planCourseId,
                item.sections,
                result
            );
        }
    }

    return { needsDecision: false, ...result };
}

/** Add one course, trying each cross-listing; returns the listing Stellic accepted. */
async function addOneCourse(
    session: StellicSession,
    termArgs: { planId: string; semId: number; year: string },
    listings: string[],
    result: ExportResult
): Promise<{ code: string; planCourseId: number | null } | null> {
    let lastError = "";
    for (const code of listings) {
        const args = { ...termArgs, courseCode: code };
        try {
            const planCourseId = await addCourse(session, args);
            result.added.push(code);
            return { code, planCourseId };
        } catch (e) {
            if (e instanceof StellicError && e.kind === "auth") throw e;
            lastError = e instanceof Error ? e.message : "unknown error";

            // Unmet prerequisites (code 494) are only a warning in Stellic:
            // its own UI asks "add anyway?" and resends with force=true.
            // A plan is not an enrollment, so do the same and tell the student.
            if (e instanceof StellicRefusal && e.code === PREREQ_REFUSAL) {
                try {
                    const planCourseId = await addCourse(session, {
                        ...args,
                        force: true
                    });
                    result.added.push(code);
                    result.prereqWarnings.push({
                        code,
                        missing: missingPrereqs(e.message),
                        message: e.message
                    });
                    return { code, planCourseId };
                } catch (e2) {
                    if (e2 instanceof StellicError && e2.kind === "auth")
                        throw e2;
                    lastError =
                        e2 instanceof Error ? e2.message : "unknown error";
                }
                break; // the prerequisite applies to every listing
            }
        }
    }
    result.failed.push({ code: listings[0], reason: lastError });
    return null;
}

/** Choose the Junction sections for a course already in the plan. */
async function setSections(
    session: StellicSession,
    args: { planId: string; semId: number; year: string; physicalYear: number },
    code: string,
    planCourseId: number,
    wanted: JunctionSection[],
    result: ExportResult
): Promise<void> {
    try {
        const groups = await getCourseSections(session, {
            ...args,
            courseCode: code,
            planCourseId
        });
        const all = groups.flatMap(g => g.sections);
        const byName = new Map(all.map(s => [s.name.toUpperCase(), s]));

        const picked: StellicSection[] = [];
        const missing: string[] = [];
        for (const s of wanted) {
            const sec = byName.get(s.name.toUpperCase());
            if (sec) picked.push(sec);
            else missing.push(s.name);
        }
        if (missing.length) {
            result.sectionNotes.push({
                code,
                message: `Stellic has no section ${missing.join(", ")}, so it was not selected.`
            });
        }
        if (!picked.length) return;

        // Stellic takes the most specific section and fills in its parent:
        // choosing P03 sends only P03 and Stellic adds L01 (seen 2026-11-16).
        // Sending L01 as well makes Stellic reset the precept to P01. So send
        // only sections that are not the parent of another chosen section.
        const parentIds = new Set(
            picked.flatMap(s => (s.parents ?? []).map(p => p.id))
        );
        const leaves = picked.filter(s => !parentIds.has(s.id));
        const wantedNames = picked.map(s => s.name.toUpperCase());

        let stored = await changeCourseSections(session, {
            ...args,
            courseCode: code,
            planCourseId,
            sectionIds: leaves.map(s => s.id)
        });
        // More than one leaf (e.g. a precept and a lab under one lecture):
        // if Stellic kept only some, set them one at a time.
        const kept = () => stored.map(s => s.name.toUpperCase());
        if (leaves.length > 1 && wantedNames.some(n => !kept().includes(n))) {
            for (const leaf of leaves) {
                stored = await changeCourseSections(session, {
                    ...args,
                    courseCode: code,
                    planCourseId,
                    sectionIds: [leaf.id]
                });
            }
        }

        const notStored = wantedNames.filter(n => !kept().includes(n));
        const extra = kept().filter(n => !wantedNames.includes(n));
        if (notStored.length) {
            result.sectionNotes.push({
                code,
                message: `Stellic did not keep ${notStored.join(", ")}.`
            });
        }
        if (extra.length) {
            result.sectionNotes.push({
                code,
                message: `Stellic also chose ${extra.join(", ")} for you; pick the one you want in Stellic.`
            });
        }
    } catch (e) {
        if (e instanceof StellicError && e.kind === "auth") throw e;
        result.sectionNotes.push({
            code,
            message: "Added, but its sections could not be set."
        });
    }
}
