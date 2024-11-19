import { drizzle } from "drizzle-orm/node-postgres";

const dbURL = process.env.DATABASE_URL;
if (!dbURL) {
    throw new Error("DATABASE_URL environment variable is required");
}

export const db = drizzle(dbURL);
