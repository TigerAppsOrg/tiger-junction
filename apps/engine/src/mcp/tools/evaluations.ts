import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { z } from "zod";
import { eq, ilike, sql, desc, and } from "drizzle-orm";
import * as schema from "../../db/schema.js";

export function registerEvaluationTools(server: McpServer, db: NodePgDatabase) {
  server.tool(
    "get_course_evaluations",
    "Get student evaluations (ratings and comments) for a course across all terms it was offered.",
    {
      listingId: z.string().optional().describe("Listing ID (e.g., '002051')"),
      code: z.string().optional().describe("Course code (e.g., 'COS 226')"),
    },
    async ({ listingId, code }) => {
      let targetListingId = listingId;
      if (!targetListingId && code) {
        const rows = await db
          .select({ listingId: schema.courses.listingId })
          .from(schema.courses)
          .where(ilike(schema.courses.code, `%${code}%`))
          .limit(1);
        targetListingId = rows[0]?.listingId;
      }

      if (!targetListingId) {
        return { content: [{ type: "text" as const, text: "Course not found." }], isError: true };
      }

      const evals = await db
        .select()
        .from(schema.evaluations)
        .where(eq(schema.evaluations.listingId, targetListingId));

      if (evals.length === 0) {
        return {
          content: [{ type: "text" as const, text: `No evaluations found for listing ${targetListingId}.` }],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                listingId: targetListingId,
                termCount: evals.length,
                evaluations: evals.map((e) => ({
                  evalTerm: e.evalTerm,
                  rating: e.rating,
                  ratingSource: e.ratingSource,
                  numComments: e.numComments,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "find_top_rated_courses",
    "Find the highest-rated courses by average evaluation score. Optionally filter by department or distribution area.",
    {
      department: z.string().optional().describe("Department code (e.g., COS)"),
      dist: z.string().optional().describe("Distribution area (e.g., LA, QCR)"),
      minRating: z.number().optional().describe("Minimum rating threshold (default 4.0)"),
      limit: z.number().optional().describe("Max results (default 20)"),
    },
    async ({ department, dist, minRating, limit: maxResults }) => {
      const threshold = minRating ?? 4.0;
      const resultLimit = maxResults ?? 20;

      const conditions = [];
      conditions.push(sql`${schema.evaluations.rating} >= ${threshold}`);

      if (department) {
        conditions.push(
          sql`${schema.evaluations.listingId} IN (
            SELECT DISTINCT ${schema.courses.listingId} FROM ${schema.courses}
            WHERE ${schema.courses.code} ILIKE ${department + "%"}
          )`
        );
      }

      if (dist) {
        conditions.push(
          sql`${schema.evaluations.listingId} IN (
            SELECT DISTINCT ${schema.courses.listingId} FROM ${schema.courses}
            WHERE ${dist} = ANY(${schema.courses.dists})
          )`
        );
      }

      const topEvals = await db
        .select({
          listingId: schema.evaluations.listingId,
          avgRating: sql<number>`AVG(${schema.evaluations.rating})`.as("avg_rating"),
          termCount: sql<number>`COUNT(*)`.as("term_count"),
        })
        .from(schema.evaluations)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(schema.evaluations.listingId)
        .orderBy(desc(sql`AVG(${schema.evaluations.rating})`))
        .limit(resultLimit);

      const enriched = await Promise.all(
        topEvals.map(async (e) => {
          const course = await db
            .select({ code: schema.courses.code, title: schema.courses.title })
            .from(schema.courses)
            .where(eq(schema.courses.listingId, e.listingId))
            .limit(1);
          return {
            listingId: e.listingId,
            code: course[0]?.code ?? "Unknown",
            title: course[0]?.title ?? "Unknown",
            avgRating: Number(e.avgRating).toFixed(2),
            termCount: e.termCount,
          };
        })
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ count: enriched.length, courses: enriched }, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "summarize_course_reviews",
    "Get the raw student comments and rating for a course so the AI can synthesize a summary. Returns all available comment text.",
    {
      listingId: z.string().optional().describe("Listing ID"),
      code: z.string().optional().describe("Course code (e.g., 'COS 126')"),
      term: z.string().optional().describe("Specific eval term (e.g., '1242'). If omitted, returns all terms."),
    },
    async ({ listingId, code, term }) => {
      let targetListingId = listingId;
      if (!targetListingId && code) {
        const rows = await db
          .select({ listingId: schema.courses.listingId })
          .from(schema.courses)
          .where(ilike(schema.courses.code, `%${code}%`))
          .limit(1);
        targetListingId = rows[0]?.listingId;
      }

      if (!targetListingId) {
        return { content: [{ type: "text" as const, text: "Course not found." }], isError: true };
      }

      const conditions = [eq(schema.evaluations.listingId, targetListingId)];
      if (term) conditions.push(eq(schema.evaluations.evalTerm, term));

      const evals = await db
        .select()
        .from(schema.evaluations)
        .where(and(...conditions));

      if (evals.length === 0) {
        return {
          content: [{ type: "text" as const, text: `No reviews found for listing ${targetListingId}.` }],
        };
      }

      const allComments: string[] = [];
      const termRatings: { term: string; rating: number | null; commentCount: number }[] = [];

      for (const e of evals) {
        if (e.comments) allComments.push(...e.comments);
        termRatings.push({
          term: e.evalTerm,
          rating: e.rating,
          commentCount: e.comments?.length ?? 0,
        });
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                listingId: targetListingId,
                termRatings,
                totalComments: allComments.length,
                comments: allComments,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
