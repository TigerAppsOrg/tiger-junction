// src/db/interface.ts
// Author(s): Joshua Lau

import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export interface I_DB {
  db: NodePgDatabase;
}
