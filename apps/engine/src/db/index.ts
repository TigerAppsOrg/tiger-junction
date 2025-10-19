// src/db/index.ts
// Author(s): Joshua Lau

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { I_DB } from "./interface";

export default class DB implements I_DB {
  public db = drizzle(process.env.POSTGRES_URL!);
}
