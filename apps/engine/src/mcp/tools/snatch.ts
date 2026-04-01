import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Db } from "mongodb";
import { z } from "zod";
import { eq, ilike, asc, and } from "drizzle-orm";
import * as schema from "../../db/schema.js";
import { formatSection, termCodeToName } from "../helpers.js";
import type { AuthContext } from "../context.js";

function calculateEnrollment(sections: { title: string; tot: number | null; cap: number | null }[]): {
  enrolled: number; capacity: number;
} {
  const byType = new Map<string, { enrolled: number; capacity: number }>();
  for (const s of sections) {
    const type = s.title.match(/^([A-Z]+)/)?.[1] ?? s.title;
    const entry = byType.get(type) ?? { enrolled: 0, capacity: 0 };
    entry.enrolled += s.tot ?? 0;
    entry.capacity += s.cap ?? 0;
    byType.set(type, entry);
  }
  if (byType.size === 0) return { enrolled: 0, capacity: 0 };
  let best = { enrolled: 0, capacity: 0 };
  for (const entry of byType.values()) {
    if (entry.enrolled > best.enrolled) best = entry;
  }
  return best;
}

function getSnatchConfig(): { url: string; token: string } | null {
  const url = process.env.SNATCH_URL?.trim();
  const token = process.env.SNATCH_TOKEN?.trim();
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

async function snatchFetch(
  path: string,
  method: "GET" | "POST" = "POST"
): Promise<{ ok: boolean; data?: any; error?: string }> {
  const config = getSnatchConfig();
  if (!config) return { ok: false, error: "TigerSnatch is not configured (missing SNATCH_URL or SNATCH_TOKEN)." };

  try {
    const response = await fetch(`${config.url}${path}`, {
      method,
      headers: { Authorization: config.token },
    });
    const data = await response.json();
    if (!response.ok) {
      return { ok: false, error: data?.message ?? `TigerSnatch returned status ${response.status}` };
    }
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: `Failed to reach TigerSnatch: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function resolveClassId(
  db: NodePgDatabase,
  courseCode: string,
  term?: number,
  sectionTitle?: string
): Promise<{ classId?: number; section?: { title: string; days: number; startTime: number; endTime: number }; courseName?: string; error?: string }> {
  const conditions = [ilike(schema.courses.code, courseCode)];
  if (term) conditions.push(eq(schema.courses.term, term));

  const courses = await db
    .select({ id: schema.courses.id, code: schema.courses.code, title: schema.courses.title, term: schema.courses.term })
    .from(schema.courses)
    .where(and(...conditions))
    .orderBy(asc(schema.courses.term))
    .limit(1);

  if (courses.length === 0) {
    return { error: `Course "${courseCode}" not found${term ? ` for ${termCodeToName(term)}` : ""}.` };
  }

  const course = courses[0];
  const sectionConditions = [eq(schema.sections.courseId, course.id)];
  if (sectionTitle) {
    sectionConditions.push(ilike(schema.sections.title, sectionTitle));
  }

  const sections = await db
    .select({
      id: schema.sections.id,
      title: schema.sections.title,
      days: schema.sections.days,
      startTime: schema.sections.startTime,
      endTime: schema.sections.endTime,
      status: schema.sections.status,
      cap: schema.sections.cap,
      tot: schema.sections.tot,
    })
    .from(schema.sections)
    .where(and(...sectionConditions))
    .orderBy(asc(schema.sections.id));

  if (sections.length === 0) {
    return { error: `No sections found for ${course.code}${sectionTitle ? ` section ${sectionTitle}` : ""}.` };
  }

  if (sections.length === 1 || sectionTitle) {
    const s = sections[0];
    return {
      classId: s.id,
      section: { title: s.title, days: s.days, startTime: s.startTime, endTime: s.endTime },
      courseName: `${course.code} — ${course.title}`,
    };
  }

  const sectionList = sections.map((s) => {
    const formatted = formatSection(s);
    return `${s.title} (${formatted.days.join("")} ${formatted.startTime}–${formatted.endTime}, ${s.status}, ${s.tot}/${s.cap} enrolled)`;
  });

  return {
    error: `${course.code} has ${sections.length} sections. Please specify which one:\n${sectionList.join("\n")}`,
  };
}

export function registerSnatchTools(
  server: McpServer,
  db: NodePgDatabase,
  authContext?: AuthContext,
  snatchDb?: Db | null
) {
  // ── get_snatch_subscriptions ────────────────────────────────────────
  server.tool(
    "get_snatch_subscriptions",
    "Get the user's current TigerSnatch notification subscriptions — classes they'll be notified about when a seat opens.",
    {},
    async () => {
      if (!authContext?.netid) {
        return { content: [{ type: "text" as const, text: "Requires authenticated user (x-user-netid header)." }], isError: true };
      }

      const result = await snatchFetch(`/junction/get_user_data/${authContext.netid}`);
      if (!result.ok) {
        return { content: [{ type: "text" as const, text: result.error ?? "Failed to get subscriptions." }], isError: true };
      }

      const userData = result.data?.data;
      if (userData === "missing") {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ subscriptions: [], message: "No TigerSnatch account found. Visit tigersnatch.com to get started." }, null, 2),
          }],
        };
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            netid: authContext.netid,
            subscriptions: userData?.waitlists ?? [],
            autoResubscribe: userData?.auto_resub ?? null,
          }, null, 2),
        }],
      };
    }
  );

  // ── subscribe_to_snatch ─────────────────────────────────────────────
  server.tool(
    "subscribe_to_snatch",
    "Subscribe to TigerSnatch notifications for a class section. You'll get notified when a seat opens. Provide a course code and optionally a specific section (e.g., 'L01'). If the course has multiple sections and none is specified, you'll be shown the available sections to choose from.",
    {
      courseCode: z.string().describe("Course code (e.g., 'COS 226')."),
      section: z.string().optional().describe("Section title (e.g., 'L01', 'P01'). If omitted and the course has multiple sections, available sections will be listed."),
      term: z.number().optional().describe("Term code (e.g., 1272 for Fall 2026). Defaults to most recent term."),
    },
    async ({ courseCode, section, term }) => {
      if (!authContext?.netid) {
        return { content: [{ type: "text" as const, text: "Requires authenticated user (x-user-netid header)." }], isError: true };
      }

      const resolved = await resolveClassId(db, courseCode, term, section);
      if (!resolved.classId) {
        return { content: [{ type: "text" as const, text: resolved.error ?? "Could not resolve class." }], isError: true };
      }

      const result = await snatchFetch(`/junction/add_to_waitlist/${authContext.netid}/${resolved.classId}`);
      if (!result.ok) {
        return { content: [{ type: "text" as const, text: result.error ?? "Failed to subscribe." }], isError: true };
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            subscribed: true,
            course: resolved.courseName,
            section: resolved.section?.title,
            classId: resolved.classId,
            message: `You'll be notified when a seat opens in ${resolved.courseName} (${resolved.section?.title}).`,
          }, null, 2),
        }],
      };
    }
  );

  // ── unsubscribe_from_snatch ─────────────────────────────────────────
  server.tool(
    "unsubscribe_from_snatch",
    "Unsubscribe from TigerSnatch notifications for a class section.",
    {
      courseCode: z.string().describe("Course code (e.g., 'COS 226')."),
      section: z.string().optional().describe("Section title (e.g., 'L01', 'P01')."),
      term: z.number().optional().describe("Term code (e.g., 1272 for Fall 2026). Defaults to most recent term."),
    },
    async ({ courseCode, section, term }) => {
      if (!authContext?.netid) {
        return { content: [{ type: "text" as const, text: "Requires authenticated user (x-user-netid header)." }], isError: true };
      }

      const resolved = await resolveClassId(db, courseCode, term, section);
      if (!resolved.classId) {
        return { content: [{ type: "text" as const, text: resolved.error ?? "Could not resolve class." }], isError: true };
      }

      const result = await snatchFetch(`/junction/remove_from_waitlist/${authContext.netid}/${resolved.classId}`);
      if (!result.ok) {
        return { content: [{ type: "text" as const, text: result.error ?? "Failed to unsubscribe." }], isError: true };
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            unsubscribed: true,
            course: resolved.courseName,
            section: resolved.section?.title,
            classId: resolved.classId,
          }, null, 2),
        }],
      };
    }
  );

  // ── DEMAND / ANALYTICS TOOLS (powered by TigerSnatch MongoDB) ──────

  if (!snatchDb) return;

  // ── get_course_demand ───────────────────────────────────────────────
  server.tool(
    "get_course_demand",
    "Get demand signals for a course from TigerSnatch: real-time enrollment vs capacity for every section, how many students are subscribed for seat-open notifications (during add/drop), and whether the course has reserved seats. Useful for gauging how competitive a class is.",
    {
      courseCode: z.string().describe("Course code (e.g., 'COS 226')."),
    },
    async ({ courseCode }) => {
      // Search TigerSnatch mappings by displayname
      const normalizedCode = courseCode.replace(/\s+/g, "").toUpperCase();
      const course = await snatchDb.collection("mappings").findOne({
        displayname: { $regex: new RegExp(`^${normalizedCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, "i") },
      });

      if (!course) {
        // Try whitespace version
        const wsMatch = await snatchDb.collection("mappings").findOne({
          displayname_whitespace: { $regex: new RegExp(courseCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i") },
        });
        if (!wsMatch) {
          return { content: [{ type: "text" as const, text: `Course "${courseCode}" not found in TigerSnatch.` }], isError: true };
        }
        return await buildDemandResponse(snatchDb, wsMatch.courseid, wsMatch.displayname_whitespace, wsMatch.title);
      }

      return await buildDemandResponse(snatchDb, course.courseid, course.displayname_whitespace, course.title);
    }
  );

  // ── get_trending_courses ────────────────────────────────────────────
  server.tool(
    "get_trending_courses",
    "Get the most in-demand courses on TigerSnatch. During add/drop, shows courses with the most notification subscribers (students waiting for seats). Between semesters, shows platform-wide stats and historical data.",
    {
      limit: z.number().optional().describe("Max courses to return (default 15)."),
    },
    async ({ limit: maxResults }) => {
      const resultLimit = maxResults ?? 15;

      const admin = await snatchDb.collection("admin").findOne({});
      if (!admin) {
        return { content: [{ type: "text" as const, text: "TigerSnatch admin data not available." }], isError: true };
      }

      const topSubs = (admin.stats_top_subs ?? []).slice(0, resultLimit);
      const hasTrendingData = topSubs.length > 0;

      if (hasTrendingData) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              term: admin.current_term_name,
              termCode: admin.current_term_code,
              trendingCourses: topSubs,
              platformStats: {
                totalSubscriptions: admin.stats_total_subs,
                subscribedUsers: admin.stats_subbed_users,
                subscribedCourses: admin.stats_subbed_courses,
                subscribedSections: admin.stats_subbed_sections,
              },
              lastUpdated: admin.stats_update_time,
            }, null, 2),
          }],
        };
      }

      // Between semesters — show aggregate stats and most-enrolled courses
      const topEnrolled = await snatchDb.collection("enrollments")
        .find({ capacity: { $gt: 5 } })
        .sort({ enrollment: -1 })
        .limit(resultLimit)
        .toArray();

      const enriched = [];
      for (const e of topEnrolled) {
        const course = await snatchDb.collection("mappings").findOne({ courseid: e.courseid });
        enriched.push({
          course: course?.displayname_whitespace ?? e.courseid,
          title: course?.title ?? "",
          section: e.section,
          enrollment: e.enrollment,
          capacity: e.capacity,
          fillPercent: e.capacity > 0 ? Math.round((e.enrollment / e.capacity) * 100) : 0,
        });
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            term: admin.current_term_name,
            termCode: admin.current_term_code,
            status: "Between semesters — no active subscriptions. Showing enrollment data.",
            topEnrolled: enriched,
            platformStats: {
              totalUsersAllTime: admin.stats_total_users,
              totalNotificationsAllTime: admin.stats_total_notifs,
            },
            lastUpdated: admin.stats_update_time,
          }, null, 2),
        }],
      };
    }
  );

  // ── get_course_historical_demand ──────────────────────────────────────
  server.tool(
    "get_course_historical_demand",
    "Get historical demand trends for a course across past semesters. Shows enrollment fill rates, closed section counts, and capacity changes over time. Answers questions like 'Is this class hard to get into?' and 'Does this course usually fill up?'. Uses engine DB data across all available terms.",
    {
      courseCode: z.string().describe("Course code (e.g., 'COS 226')."),
    },
    async ({ courseCode }) => {
      // Resolve course to listing_id via engine DB
      const courseRows = await db
        .select({
          listingId: schema.courses.listingId,
          code: schema.courses.code,
          title: schema.courses.title,
        })
        .from(schema.courses)
        .where(ilike(schema.courses.code, courseCode))
        .orderBy(asc(schema.courses.term))
        .limit(1);

      if (courseRows.length === 0) {
        return { content: [{ type: "text" as const, text: `Course "${courseCode}" not found.` }], isError: true };
      }

      const { listingId, code, title } = courseRows[0];

      // Get all offerings of this course across terms
      const offerings = await db
        .select({
          term: schema.courses.term,
          courseId: schema.courses.id,
          status: schema.courses.status,
        })
        .from(schema.courses)
        .where(eq(schema.courses.listingId, listingId))
        .orderBy(asc(schema.courses.term));

      const termStats = [];
      let totalFillRateSum = 0;
      let termsWithEnrollment = 0;
      let termsFullyClosed = 0;
      let termsWithClosedSections = 0;

      for (const offering of offerings) {
        const sections = await db
          .select({
            title: schema.sections.title,
            status: schema.sections.status,
            cap: schema.sections.cap,
            tot: schema.sections.tot,
          })
          .from(schema.sections)
          .where(eq(schema.sections.courseId, offering.courseId));

        const { enrolled: totalEnrolled, capacity: totalCap } = calculateEnrollment(sections);
        const closedCount = sections.filter((s) => s.status === "closed").length;
        const canceledCount = sections.filter((s) => s.status === "canceled").length;
        const fillRate = totalCap > 0 ? Math.round((totalEnrolled / totalCap) * 100) : 0;

        // Only count terms with actual enrollment data (not future terms)
        if (totalEnrolled > 0) {
          totalFillRateSum += fillRate;
          termsWithEnrollment++;
          if (offering.status === "closed") termsFullyClosed++;
          if (closedCount > 0) termsWithClosedSections++;
        }

        termStats.push({
          term: offering.term,
          termName: termCodeToName(offering.term),
          courseStatus: offering.status,
          totalEnrolled,
          totalCapacity: totalCap,
          fillRate: `${fillRate}%`,
          sections: sections.length,
          closedSections: closedCount,
          canceledSections: canceledCount,
        });
      }

      const avgFillRate = termsWithEnrollment > 0
        ? Math.round(totalFillRateSum / termsWithEnrollment)
        : 0;

      // Determine competitiveness
      let competitiveness: string;
      if (avgFillRate >= 95 || termsFullyClosed >= termsWithEnrollment * 0.5) {
        competitiveness = "Very Competitive — this course consistently fills up and often closes. Plan to enroll early or use TigerSnatch.";
      } else if (avgFillRate >= 80) {
        competitiveness = "Competitive — this course typically fills most of its seats. Early enrollment recommended.";
      } else if (avgFillRate >= 50) {
        competitiveness = "Moderate — this course usually has available seats but does fill up in popular sections.";
      } else {
        competitiveness = "Low — this course generally has plenty of available seats.";
      }

      // Capacity trend
      const capsOverTime = termStats
        .filter((t) => t.totalCapacity > 0)
        .map((t) => t.totalCapacity);
      let capacityTrend = "Stable";
      if (capsOverTime.length >= 2) {
        const first = capsOverTime[0];
        const last = capsOverTime[capsOverTime.length - 1];
        const change = ((last - first) / first) * 100;
        if (change > 15) capacityTrend = `Growing (+${Math.round(change)}% capacity since ${termStats[0].termName})`;
        else if (change < -15) capacityTrend = `Shrinking (${Math.round(change)}% capacity since ${termStats[0].termName})`;
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            course: code,
            title,
            termsOffered: offerings.length,
            termsWithEnrollmentData: termsWithEnrollment,
            averageFillRate: `${avgFillRate}%`,
            timesFullyClosed: `${termsFullyClosed}/${termsWithEnrollment} terms`,
            timesWithClosedSections: `${termsWithClosedSections}/${termsWithEnrollment} terms`,
            capacityTrend,
            competitiveness,
            history: termStats,
          }, null, 2),
        }],
      };
    }
  );
}

async function buildDemandResponse(snatchDb: Db, courseid: string, displayName: string, title: string) {
  // Get enrollment data for all sections
  const enrollments = await snatchDb.collection("enrollments")
    .find({ courseid })
    .toArray();

  // Get course doc for reserved seats and waitlist info
  const courseDoc = await snatchDb.collection("courses").findOne({ courseid });

  // Get waitlist sizes for each section
  const sectionDemand = [];
  for (const e of enrollments) {
    const classKey = `class_${e.classid}`;
    const classInfo = courseDoc?.[classKey] as Record<string, unknown> | undefined;

    // Check waitlist for this class
    const waitlistDoc = await snatchDb.collection("waitlists").findOne({ classid: String(e.classid) });
    const subscriberCount = Array.isArray(waitlistDoc?.netids) ? waitlistDoc.netids.length : 0;

    sectionDemand.push({
      section: e.section,
      classId: e.classid,
      enrollment: e.enrollment,
      capacity: e.capacity,
      fillPercent: e.capacity > 0 ? Math.round((e.enrollment / e.capacity) * 100) : 0,
      isOpen: classInfo?.status_is_open ?? (e.enrollment < e.capacity),
      subscribers: subscriberCount,
      days: classInfo?.days ?? null,
      startTime: classInfo?.start_time ?? null,
      endTime: classInfo?.end_time ?? null,
    });
  }

  const totalEnrollment = enrollments.reduce((s, e) => s + e.enrollment, 0);
  const totalCapacity = enrollments.reduce((s, e) => s + e.capacity, 0);
  const totalSubscribers = sectionDemand.reduce((s, d) => s + d.subscribers, 0);

  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        course: displayName,
        title,
        hasReservedSeats: courseDoc?.has_reserved_seats ?? false,
        overallFill: totalCapacity > 0 ? `${totalEnrollment}/${totalCapacity} (${Math.round((totalEnrollment / totalCapacity) * 100)}%)` : "N/A",
        totalSubscribers,
        sections: sectionDemand,
        demandLevel: totalSubscribers > 50 ? "Very High" : totalSubscribers > 20 ? "High" : totalSubscribers > 5 ? "Moderate" : totalSubscribers > 0 ? "Low" : "None (no active watchers)",
      }, null, 2),
    }],
  };
}
