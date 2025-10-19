// src/cli.ts
// Author(s): Joshua Lau

import OIT_API from "./oit";

const api = new OIT_API();
const d = await api.getDeptCourses("1262", "COS");
console.log(d.map((x) => x.instructors));
const x = await api.getCourseDetails("1262", "002065");
console.log(x);
