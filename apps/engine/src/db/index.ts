// src/db/index.ts
// Author(s): Joshua Lau

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { I_DB } from "./interface";
import OIT from "../oit";

export default class DB implements I_DB {
  public db = drizzle(process.env.POSTGRES_URL!);

  constructor() {
    if (!process.env.POSTGRES_URL) {
      throw new Error("POSTGRES_URL environment variable is not set.");
    }
  }

  public async updateOitData() {
    const oit = new OIT();
    const latestTerm = await oit.getLatestTermCode();
    if (!latestTerm)
      throw new Error("No terms found in OIT data. Please check OIT API connectivity.");

    // ! This takes a while to run (several minutes)
    const courses = await oit.getAllCourseData(latestTerm);
  }
}
