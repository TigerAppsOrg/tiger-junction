import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export interface I_DB {
  db: NodePgDatabase;
}
