// src/db/interface.ts
// Author(s): Joshua Lau

import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { OIT_Eval } from "../oit/types";

export interface I_DB {
  db: NodePgDatabase;

  /**
   * Tests the database connection by executing a simple query.
   */
  testConnection(): Promise<void>;

  /**
   * Updates the database with the latest data from the OIT API.
   * This includes courses, sections, and instructors.
   */
  updateOitData(): Promise<void>;

  /**
   * Retrieves all unique listing IDs from the courses table.
   */
  getAllListingIds(): Promise<string[]>;

  upsertEval(courseId: string, evalData: OIT_Eval): Promise<void>;
}
