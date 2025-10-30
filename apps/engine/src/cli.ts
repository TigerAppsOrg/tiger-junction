// src/cli.ts
// Author(s): Joshua Lau

import OIT_API from "./oit";
import DB from "./db";
import util from "util";
import { updateEvals } from "./scripts/updateEvals";

// Override console.log to print objects with full depth
const originalLog = console.log;
console.log = function (...args) {
  const inspectedArgs = args.map((arg) =>
    typeof arg === "object" && arg !== null ? util.inspect(arg, { depth: null, colors: true }) : arg
  );
  originalLog(...inspectedArgs);
};

const oit = new OIT_API();
const db = new DB();
await updateEvals(db, oit);

process.exit(0);
