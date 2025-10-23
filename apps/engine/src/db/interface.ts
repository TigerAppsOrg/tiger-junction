// src/db/interface.ts
// Author(s): Joshua Lau

import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export interface I_DB {
  db: NodePgDatabase;

  /**
   * Updates the database with the latest data from the OIT API.
   * This includes courses, sections, and instructors.
   */
  updateOitData(): Promise<void>;
}
