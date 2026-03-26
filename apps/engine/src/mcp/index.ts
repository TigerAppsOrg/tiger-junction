import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { SupabaseClient } from "@supabase/supabase-js";
import { registerCourseTools } from "./tools/courses.js";
import { registerEvaluationTools } from "./tools/evaluations.js";
import { registerInstructorTools } from "./tools/instructors.js";
import { registerScheduleTools } from "./tools/schedules.js";
import { registerJunctionScheduleTools } from "./tools/junction-schedules.js";
import type { AuthContext } from "./context.js";

export type McpToolScope = "full" | "princetoncourses" | "junction";

export function createMcpServer(
  db: NodePgDatabase,
  authContext?: AuthContext,
  scope: McpToolScope = "full",
  supabaseClient?: SupabaseClient | null
): McpServer {
  const server = new McpServer({
    name: "junction-engine",
    version: "1.0.0",
  });

  const junctionCtx = scope === "junction" && supabaseClient
    ? { supabase: supabaseClient, authContext }
    : undefined;
  registerCourseTools(server, db, junctionCtx);
  registerEvaluationTools(server, db);
  registerInstructorTools(server, db);

  if (scope === "full") {
    registerScheduleTools(server, db, authContext);
  } else if (scope === "junction" && supabaseClient) {
    registerJunctionScheduleTools(server, supabaseClient, authContext);
  }

  return server;
}
