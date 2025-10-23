// src/cli.ts
// Author(s): Joshua Lau

import OIT_API from "./oit";
import DB from "./db";
import util from "util";

// Override console.log to print objects with full depth
const originalLog = console.log;
console.log = function (...args) {
  const inspectedArgs = args.map((arg) =>
    typeof arg === "object" && arg !== null ? util.inspect(arg, { depth: null, colors: true }) : arg
  );
  originalLog(...inspectedArgs);
};

// const api = new OIT_API();
// const d = await api.getAllCourseData("1262");
// console.log(d);

const db = new DB();
await db.updateOitData();
