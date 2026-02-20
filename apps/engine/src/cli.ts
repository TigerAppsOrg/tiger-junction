// src/cli.ts
// Author(s): Joshua Lau

import DB from "./db";
import { seed } from "./db/seed";
import util from "util";

// Override console.log to print objects with full depth
const originalLog = console.log;
console.log = function (...args) {
  const inspectedArgs = args.map((arg) =>
    typeof arg === "object" && arg !== null ? util.inspect(arg, { depth: null, colors: true }) : arg
  );
  originalLog(...inspectedArgs);
};

const command = process.argv[2];

switch (command) {
  case "seed": {
    await seed();
    break;
  }
  case "update": {
    const db = new DB();
    await db.updateOitData();
    break;
  }
  default: {
    console.log("Usage: bun cli <command>\n");
    console.log("Commands:");
    console.log("  update    Fetch latest OIT data and update the database");
    console.log("  seed      Seed test users, schedules, events, and feedback");
    break;
  }
}
