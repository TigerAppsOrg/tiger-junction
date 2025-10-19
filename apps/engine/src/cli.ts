// src/cli.ts
// Author(s): Joshua Lau

import OIT_API from "./oit";

const api = new OIT_API();
const evals = await api.getCourseEvals("012069");
console.log(evals);
