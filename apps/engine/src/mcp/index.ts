import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Pool } from "pg";
import { registerCourseTools } from "./tools/courses.js";
import { registerEvaluationTools } from "./tools/evaluations.js";
import { registerInstructorTools } from "./tools/instructors.js";
import { registerScheduleTools } from "./tools/schedules.js";
import { registerJunctionScheduleTools } from "./tools/junction-schedules.js";
import { registerSnatchTools } from "./tools/snatch.js";
import { registerTigerpathTools } from "./tools/tigerpath.js";
import type { Db } from "mongodb";
import type { AuthContext } from "./context.js";

export type McpToolScope = "full" | "princetoncourses" | "junction" | "snatch" | "path";

export function createMcpServer(
  db: NodePgDatabase,
  authContext?: AuthContext,
  scope: McpToolScope = "full",
  supabaseClient?: SupabaseClient | null,
  snatchDb?: Db | null,
  tigerpathPool?: Pool | null
): McpServer {
  const server = new McpServer({
    name: "junction-engine",
    version: "1.0.0",
  });

  if (scope === "path") {
    registerTigerpathTools(server, tigerpathPool ?? undefined, authContext);
    return server;
  }

  const junctionCtx = scope === "junction" && supabaseClient
    ? { supabase: supabaseClient, authContext }
    : undefined;
  registerCourseTools(server, db, junctionCtx);
  registerEvaluationTools(server, db);
  registerInstructorTools(server, db);

  // TigerPath tools: requirements + analytics for all scopes, schedule R/W only when auth is present
  if (tigerpathPool) {
    registerTigerpathTools(
      server,
      tigerpathPool,
      scope === "junction" || scope === "full" ? authContext : undefined,
    );
  }

  if (scope === "full") {
    registerScheduleTools(server, db, authContext);
  } else if (scope === "junction" && supabaseClient) {
    registerJunctionScheduleTools(server, supabaseClient, authContext);
    registerSnatchTools(server, db, authContext, snatchDb);
  } else if (scope === "snatch") {
    registerSnatchTools(server, db, authContext, snatchDb);
  }

  return server;
}
