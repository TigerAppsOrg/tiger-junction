import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { registerCourseTools } from "./tools/courses.js";
import { registerEvaluationTools } from "./tools/evaluations.js";
import { registerInstructorTools } from "./tools/instructors.js";
import { registerScheduleTools } from "./tools/schedules.js";
import { registerPlanningTools } from "./tools/planning.js";
import { registerPrerequisiteTools } from "./tools/prerequisites.js";
import { registerRequirementTools } from "./tools/requirements.js";

export function createMcpServer(db: NodePgDatabase): McpServer {
  const server = new McpServer({
    name: "junction-engine",
    version: "1.0.0",
  });

  registerCourseTools(server, db);
  registerEvaluationTools(server, db);
  registerInstructorTools(server, db);
  registerScheduleTools(server, db);
  registerPlanningTools(server, db);
  registerPrerequisiteTools(server, db);
  registerRequirementTools(server, db);

  return server;
}
